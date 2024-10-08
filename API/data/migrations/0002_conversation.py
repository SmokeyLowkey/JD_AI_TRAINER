# Generated by Django 5.0.7 on 2024-07-31 05:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Conversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.CharField(max_length=255, unique=True)),
                ('history', models.JSONField(default=list)),
                ('last_interaction', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
