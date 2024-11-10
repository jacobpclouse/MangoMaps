import pandas as pd
import json
import re
# Source: https://www.nyc.gov/assets/buildings/pdf/ll33_Data_Disclosure_2022-CBL.pdf


def add_num_suffix(address):
    match = re.search(r'(\d+)\s+(.*)', address)
    if match:
        number = int(match.group(1))
        suffix = get_ordinal_suffix(number)
        return address.replace(str(number), f"{number}{suffix}", 1)
    return address

def get_ordinal_suffix(number):
    # Handle special cases for 11, 12, 13
    if 11 <= number % 100 <= 13:
        return 'th'
    # Handle other cases
    elif number % 10 == 1:
        return 'st'
    elif number % 10 == 2:
        return 'nd'
    elif number % 10 == 3:
        return 'rd'
    else:
        return 'th'

def parse_excel_to_json(excel_file, output_json_file):
    df = pd.read_excel(excel_file)

    parsed_data = []

    for index, row in df.iterrows():
        # print(index)
        # print(row)

        street_number = str(round(row['Street\nNumber'])) + ' ' if pd.notna(row['Street\nNumber']) else ''
        score = row['Energy Star 1 to 100 Score'] if not row['Energy Star 1 to 100 Score'] == "missing required benchmarking\ninformation" else "missing required benchmarking information"
        row['Street Name'] = add_num_suffix(row['Street Name'])

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