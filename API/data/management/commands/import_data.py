# myapp/management/commands/import_data.py
import os
import re
import pandas as pd
from django.core.management.base import BaseCommand
from data.models import MachineModel, Part

class Command(BaseCommand):
    help = 'Import data from Excel files into the database'

    def handle(self, *args, **kwargs):
        # Path to the directory containing the Excel files
        excel_dir = r'C:\coding projects\JD_AI_PARTS\API\excel files'

        # List of Excel files to be processed
        excel_files = [
            '260E Articulated Dump Truck (PIN 1DW260E_ _F708125-716724) - PC15346.xlsx',
            '260E Articulated Dump Truck (PIN 1DW260E_ _D708125-716724) - PC15347.xlsx',
            '260E Articulated Dump Truck (PIN 1DW260EX_ _D677827-708124) - PC15085.xlsx',
            '260E Articulated Dump Truck (PIN 1DW260EX_ _F677827-708124) - PC15087.xlsx'
        ]

        for file in excel_files:
            file_path = os.path.join(excel_dir, file)
            self.stdout.write(self.style.SUCCESS(f'Processing file: {file_path}'))

            # Check if file exists
            if not os.path.exists(file_path):
                self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
                continue

            # Extract model name and serial number range from the filename
            try:
                model_name, serial_start, serial_end = self._extract_serial_numbers(file)
            except ValueError as e:
                self.stdout.write(self.style.ERROR(f'Error extracting serial numbers from file {file}: {e}'))
                continue

            # Read the Excel file
            try:
                xls = pd.ExcelFile(file_path)
                for sheet_name in xls.sheet_names:
                    df = pd.read_excel(xls, sheet_name=sheet_name)
                    self._import_data(df, model_name, serial_start, serial_end)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing file {file}: {e}'))

    def _extract_serial_numbers(self, filename):
        # Updated regex pattern to match the filename format
        pattern = r'(.+?) \(PIN 1DW260E(X?)_ _([DF]\d+)-(\d+)\)'
        match = re.search(pattern, filename)
        if match:
            model_name = match.group(1).strip()
            serial_start = match.group(2)
            serial_end = match.group(3)
            return model_name, serial_start, serial_end
        else:
            raise ValueError(f'Invalid filename format: {filename}')

    def _import_data(self, df, model_name, serial_start, serial_end):
        # Create or update MachineModel
        machine_model, created = MachineModel.objects.get_or_create(
            model_name=model_name,
            serial_number_start=serial_start,
            serial_number_end=serial_end
        )

        for _, row in df.iterrows():
            part_number = row.get('Part Number')
            description = row.get('Part Description')
            quantity_required = row.get('Quantity Required')
            canvas_image = row.get('Canvas Image')
            breadcrumb = row.get('Breadcrumb')

            # Create or update Part
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
