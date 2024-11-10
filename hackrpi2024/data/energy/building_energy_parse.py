import pandas as pd
import json

# Source: https://www.nyc.gov/assets/buildings/pdf/ll33_Data_Disclosure_2022-CBL.pdf

def parse_excel_to_json(excel_file, output_json_file):
    df = pd.read_excel(excel_file)

    parsed_data = []

    for index, row in df.iterrows():
        # print(index)
        # print(row)

        street_number = str(round(row['Street\nNumber'])) + ' ' if pd.notna(row['Street\nNumber']) else ''
        score = row['Energy Star 1 to 100 Score'] if not row['Energy Star 1 to 100 Score'] == "missing required benchmarking\ninformation" else "missing required benchmarking information"

        row_dict = {
            "addr": street_number + str(row['Street Name']),
            "score": score,
            "grade": row['Energy\nEfficiency\nGrade']
        }

        parsed_data.append(row_dict)

    with open(output_json_file, 'w') as json_file:
        json.dump(parsed_data, json_file, indent=4)

    print(f"Data has been successfully parsed and saved to {output_json_file}")

excel_file = 'building_energy.xlsx'
output_json_file = 'building_energy_data.json'

parse_excel_to_json(excel_file, output_json_file)