import base64
import os
import random
import uuid
import boto3
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
from openai import OpenAI
from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from data.models import MachineModel, Part, Conversation
from data.serializers import MachineModelSerializer, PartSerializer
import azure.cognitiveservices.speech as speechsdk

# Initialize the OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

class MachineModelViewSet(viewsets.ModelViewSet):
    queryset = MachineModel.objects.all()
    serializer_class = MachineModelSerializer

class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    
def avatar_presigned_url(request):
    s3_client = boto3.client('s3',
                             aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                             aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                             region_name=settings.AWS_S3_REGION_NAME)
    # Construct the key for the S3 object
    object_key = f'Avatar/maleAvatar.glb'
    # print("Object Key for S3:", object_key)  # Logging the object key

    presigned_url = s3_client.generate_presigned_url('get_object', Params={
        'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
        'Key': object_key}, ExpiresIn=900)
    # print("Generated Presigned URL:", presigned_url)  # Logging the presigned URL
    return JsonResponse({'url': presigned_url})

def animation_presigned_url(request):
    s3_client = boto3.client('s3',
                             aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                             aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                             region_name=settings.AWS_S3_REGION_NAME)
    # Construct the key for the S3 object
    object_key = f'Avatar/animations.glb'
    # print("Object Key for S3:", object_key)  # Logging the object key

    presigned_url = s3_client.generate_presigned_url('get_object', Params={
        'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
        'Key': object_key}, ExpiresIn=900)
    # print("Generated Presigned URL:", presigned_url)  # Logging the presigned URL
    return JsonResponse({'url': presigned_url})

def generate_random_serial_number(serial_start, serial_end):
    if not serial_start or not serial_end:
        raise ValueError("Serial start and end cannot be empty")

    # Check if serial numbers are numeric
    if serial_start.isdigit() and serial_end.isdigit():
        return str(random.randint(int(serial_start), int(serial_end))).zfill(6)
    else:
        # Handle case where serial start has a prefix
        prefix = ''
        if not serial_start[0].isdigit():
            prefix = serial_start[0]
            serial_start = serial_start[1:]

            if serial_start.isdigit() and serial_end.isdigit():
                # Ensure that the numeric part of serial_end is greater than serial_start
                if int(serial_end) > int(serial_start):
                    numeric_part = str(random.randint(int(serial_start), int(serial_end))).zfill(5)
                    return prefix + numeric_part
                else:
                    raise ValueError("Invalid range for alphanumeric serial numbers")
            else:
                raise ValueError("Invalid serial number format after removing prefix")
        else:
            raise ValueError("Invalid serial number format")
        
def synthesize_speech_with_visemes(text, api_key, region, output_file_path):
    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)
    speech_config = speechsdk.SpeechConfig(subscription=api_key, region=region)
    speech_config.speech_synthesis_voice_name = "en-CA-LiamNeural"  # Set the voice name @ https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
    audio_config = speechsdk.audio.AudioConfig(filename=output_file_path)

    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    viseme_data = []

    def viseme_cb(evt):
        viseme_data.append({
            'audio_offset': evt.audio_offset/10000,
            'viseme_id': evt.viseme_id
        })

    synthesizer.viseme_received.connect(viseme_cb)
    result = synthesizer.speak_text_async(text).get()
    
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print("Speech synthesized successfully")
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print(f"Speech synthesis canceled: {cancellation_details.reason}")
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            print(f"Error details: {cancellation_details.error_details}")
    return viseme_data

@api_view(['POST'])
def interact_with_ai(request):
    user_query = request.data.get('query', '')
    session_id = request.data.get('session_id', str(uuid.uuid4()))
    incorrect_attempts = request.data.get('incorrect_attempts', 0)

    if not user_query:
        return Response({"error": "Query is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get or create the conversation
        conversation, created = Conversation.objects.get_or_create(session_id=session_id)
        now = timezone.now()
        
        # Reset session if older than a day
        if not created and conversation.last_interaction < now - timedelta(days=1):
            conversation.delete()
            conversation = Conversation.objects.create(session_id=session_id)
            created = True
        
        # Randomly select a machine model if it's the first interaction
        if created or not conversation.history:
            machine_model = random.choice(MachineModel.objects.all())
            serial_number = generate_random_serial_number(machine_model.serial_number_start, machine_model.serial_number_end)
            
            # Randomly select a part to ask about
            part_to_find = random.choice(Part.objects.filter(machine_model=machine_model))
            
            initial_prompt = (
                f"You are a customer who owns a machine model '{machine_model.model_name}' with the serial number '{serial_number}'. "
                f"You need a part but don't know the part number. The part you need is described as '{part_to_find.description}'. "
                f"Location of the part: '{part_to_find.breadcrumb}'. "
                "Ask the support representative to help you identify the correct part number based on the description of the part you need. "
                "Do not reveal the part number, but check if the representative provides the correct one."
                "If the representative provides an incorrect part number respond with: 'I just looked it up and that is not the correct part I am looking for!' "
                "If the representative provides a correct part number, then respond with: 'That is correct, thank you!' "
            )
            conversation.history.append({"id": str(uuid.uuid4()), "role": "system", "content": initial_prompt})
            conversation.history.append({"id": str(uuid.uuid4()), "role": "system", "content": f"Expected part number: {part_to_find.part_number}"})
            conversation.history.append({"id": str(uuid.uuid4()), "role": "system", "content": f"Part location: {part_to_find.breadcrumb}"})
            conversation.save()
        else:
            # Retrieve the expected part number from the conversation history
            expected_part_number = next(
                (item["content"].split(": ")[1] for item in conversation.history if "Expected part number" in item["content"]),
                None
            )
            part_location = next(
                (item["content"].split(": ", 1)[1] for item in conversation.history if "Part location" in item["content"]),
                None
            )

            # Check if the user's query contains the correct part number
            part_number_correct = expected_part_number in user_query
            if part_number_correct:
                incorrect_attempts = 0
            else:
                incorrect_attempts = request.data.get('incorrect_attempts', 0) + 1

            if incorrect_attempts >= 3:
                part_number_correct = False
        
        # Append user's message to the history
        conversation.history.append({"id": str(uuid.uuid4()), "role": "user", "content": user_query})
                
        # Generate a prompt for the AI including the conversation history
        chat_completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=conversation.history
        )
        
        ai_response = chat_completion.choices[0].message.content.strip()
        
        if created or 'more info' in user_query.lower():
            selected_animation = "Talking"
        elif 'part_number_correct' in locals() and part_number_correct:
            selected_animation = random.choice(["Clapping", "ThoughtfulHeadNod"])
        else:
            selected_animation = "ThoughtfulHeadShake"
        
        # Append AI's response to the history
        conversation.history.append({"id": str(uuid.uuid4()), "role": "assistant", "content": ai_response})
                
        # Generate audio and visemes
        audio_file_name = f"message_{uuid.uuid4()}.wav"
        output_file_path = os.path.join('audios', audio_file_name)
        viseme_data = synthesize_speech_with_visemes(ai_response, settings.AZURE_API_KEY, settings.AZURE_REGION, output_file_path)

        
        with open(output_file_path, 'rb') as audio_file:
            audio_content = audio_file.read()
        
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')

        
        # Save the updated conversation history
        conversation.save()
        
        return Response({
            "response": ai_response, 
            "session_id": session_id, 
            "history": conversation.history,
            "part_number_correct": part_number_correct if 'part_number_correct' in locals() else None,
            "expected_part_number": expected_part_number if 'expected_part_number' in locals() else None,
            "part_location": part_location if 'part_location' in locals() else None,
            "audio": audio_base64,
            "visemes": viseme_data,
            "animation": selected_animation
        }, status=status.HTTP_200_OK)

    except MachineModel.DoesNotExist:
        return Response({"error": "Machine model not found."}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as ve:
        return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
