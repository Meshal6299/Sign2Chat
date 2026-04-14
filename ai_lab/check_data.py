import json

json_path = 'dataset/WLASL_v0.3.json' 

try:
    with open(json_path, 'r') as file:
        wlasl_data = json.load(file)
        
    print(f"Total words in dataset: {len(wlasl_data)}")
    
    print("\nFirst 10 words found:")
    for i in range(10):
        print(f"- {wlasl_data[i]['gloss']}")
        
except FileNotFoundError:
    print("Could not find the JSON file. Check the folder path and name.")