# admin.py
from django.contrib import admin
from django.shortcuts import render, redirect
from django.urls import path
from django.utils.html import format_html
import re
import pandas as pd
from django.contrib import admin
from .models import MachineModel, Part, Conversation
from .forms import ExcelUploadForm

@admin.register(MachineModel)
class MachineModelAdmin(admin.ModelAdmin):
    list_display = ('model_name', 'serial_number_start', 'serial_number_end')
    search_fields = ('model_name', 'serial_number_start', 'serial_number_end')

@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = ('part_number', 'description', 'quantity_required', 'machine_model')
    search_fields = ('part_number', 'description')
    list_filter = ('machine_model',)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('upload-excel/', self.upload_excel, name='upload_excel'),
        ]
        return custom_urls + urls

    def upload_excel(self, request):
        if request.method == 'POST':
            form = ExcelUploadForm(request.POST, request.FILES)
            if form.is_valid():
                excel_file = request.FILES['excel_file']
                try:
                    xls = pd.ExcelFile(excel_file)
                    for sheet_name in xls.sheet_names:
                        df = pd.read_excel(xls, sheet_name=sheet_name)
                        for _, row in df.iterrows():
                            self._import_data(row, excel_file.name)  # Pass filename here
                    self.message_user(request, "Excel file imported successfully")
                except Exception as e:
                    self.message_user(request, f"Error importing data: {e}", level='error')
                return redirect("..")
        else:
            form = ExcelUploadForm()

        context = {
            'form': form,
            'title': 'Upload Excel file'
        }
        return render(request, 'admin/excel_upload.html', context)

    def _extract_serial_numbers(self, filename):
        # Updated regex pattern to match different filename formats
        pattern = r'(.+?) \(PIN 1(?:FF|DW|BZ|T0)\d{3}[A-Z]{1,2}_ _[A-Z]([A-Z]?\d*)-([A-Z]?\d+)\).*'
        match = re.search(pattern, filename)
        if match:
            model_name = match.group(1).strip()
            serial_start = match.group(2)
            serial_end = match.group(3)
            return model_name, serial_start, serial_end
        else:
            raise ValueError(f'Invalid filename format: {filename}')

    def _import_data(self, row, filename):
        model_name, serial_start, serial_end = self._extract_serial_numbers(filename)

        machine_model, created = MachineModel.objects.get_or_create(
            model_name=model_name,
            serial_number_start=serial_start,
            serial_number_end=serial_end
        )

        part_number = row.get('Part Number')
        description = row.get('Part Description')
        quantity_required = row.get('Quantity Required')
        canvas_image = row.get('Canvas Image')
        breadcrumb = row.get('Breadcrumb')

        Part.objects.update_or_create(
            machine_model=machine_model,
            part_number=part_number,
            defaults={
                'description': description,
                'quantity_required': quantity_required,
                'canvas_image': canvas_image,
                'breadcrumb': breadcrumb
            }
        )

    def upload_excel_link(self, obj):
        return format_html('<a href="{}">Upload Excel file</a>', 'upload-excel/')

    upload_excel_link.short_description = "Upload Excel file"
    upload_excel_link.allow_tags = True

    change_list_template = 'admin/part_change_list.html'

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'last_interaction')
    actions = ['delete_selected_conversations']

    def delete_selected_conversations(self, request, queryset):
        queryset.delete()
    delete_selected_conversations.short_description = 'Delete selected conversations'