# models.py
from django.db import models

class MachineModel(models.Model):
    model_name = models.CharField(max_length=255)
    serial_number_start = models.CharField(max_length=255)
    serial_number_end = models.CharField(max_length=255)
    
    class Meta:
        unique_together = ('model_name', 'serial_number_start', 'serial_number_end')

    def __str__(self):
        return self.model_name

class Part(models.Model):
    machine_model = models.ForeignKey(MachineModel, related_name='parts', on_delete=models.CASCADE)
    part_number = models.CharField(max_length=50)
    description = models.CharField(max_length=255)
    quantity_required = models.IntegerField()
    canvas_image = models.URLField(blank=True, null=True)
    breadcrumb = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.part_number
    
class Conversation(models.Model):
    session_id = models.CharField(max_length=255, unique=True)
    history = models.JSONField(default=list)  # Stores the conversation history as a list of messages
    last_interaction = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.session_id   
