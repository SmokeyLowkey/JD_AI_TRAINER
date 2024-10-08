# Generated by Django 5.0.7 on 2024-07-29 07:12

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='MachineModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('model_name', models.CharField(max_length=255)),
                ('serial_number_start', models.CharField(max_length=255)),
                ('serial_number_end', models.CharField(max_length=255)),
            ],
        ),
        migrations.CreateModel(
            name='Part',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('part_number', models.CharField(max_length=50)),
                ('description', models.CharField(max_length=255)),
                ('quantity_required', models.IntegerField()),
                ('canvas_image', models.URLField(blank=True, null=True)),
                ('breadcrumb', models.TextField(blank=True, null=True)),
                ('machine_model', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parts', to='data.machinemodel')),
            ],
        ),
    ]
