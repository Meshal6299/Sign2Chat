import os

TXT_FILE_PATH = 'dataset/missing.txt' 
VIDEOS_FOLDER_PATH = 'dataset/videos' 

def check_videos():
    if not os.path.exists(TXT_FILE_PATH):
        print(f"Error: {TXT_FILE_PATH} not found.")
        return

    with open(TXT_FILE_PATH, 'r') as f:
        expected_ids = {line.strip() for line in f if line.strip()}

    if not os.path.exists(VIDEOS_FOLDER_PATH):
        print(f"Error: Folder {VIDEOS_FOLDER_PATH} not found.")
        return

    found_files = os.listdir(VIDEOS_FOLDER_PATH)
    found_ids = {os.path.splitext(f)[0] for f in found_files if f.endswith('.mp4')}

    still_missing = expected_ids - found_ids
    extra_files = found_ids - expected_ids

    print(f"Total IDs in missing.txt: {len(expected_ids)}")
    print(f"Total videos found in folder: {len(found_ids)}")

    if not still_missing:
        print("SUCCESS: All videos from the list are present in the folder!")
    else:
        print(f"STILL MISSING: {len(still_missing)} videos are still not there.")
        print(f"List of missing IDs: {list(still_missing)[:10]}...")

    if extra_files:
        print(f"but I found {len(extra_files)} videos in the folder NOT listed in the text file.")

if __name__ == "__main__":
    check_videos()