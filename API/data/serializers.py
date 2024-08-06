# serializers.py
from rest_framework import serializers
from .models import MachineModel, Part, Conversation

class PartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Part
        fields = '__all__'

class MachineModelSerializer(serializers.ModelSerializer):
    parts = PartSerializer(many=True, read_only=True)

    class Meta:
        model = MachineModel
        fields = '__all__'
        
class ConversationSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Conversation
        fields = ['session_id', 'history', 'last_interaction']
