import os
import time
from google import genai
from google.genai import types

def generate_video():
    # Load the API key
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment.")
        return

    # Initialize the client
    client = genai.Client(api_key=api_key)

    # Read the prompt
    prompt_path = "/Users/bucci369/.openclaw/workspace/video_prompt.txt"
    with open(prompt_path, "r") as f:
        video_prompt = f.read()

    print(f"🎬 Starting video generation with Veo 3.1...")
    print(f"📝 Prompt loaded from {prompt_path}")

    try:
        # Generate the video
        # In Feb 2026, Veo 3.1 is the standard
        operation = client.models.generate_videos(
            model='veo-3.1-generate-preview',
            source=types.GenerateVideosSource(
                prompt=video_prompt
            ),
            config=types.GenerateVideosConfig(
                aspect_ratio='9:16'
            )
        )

        print(f"⏳ Generation in progress (ID: {operation.name})...")

        # Poll for completion
        while not operation.done:
            print("...")
            time.sleep(10)
            operation = client.operations.get(operation)

        if operation.error:
            print(f"❌ Error during generation: {operation.error}")
            return

        # Get the result
        result = operation.result
        
        if result.generated_videos:
             video_uri = result.generated_videos[0].video.uri
             # The URI looks like 'https://generativelanguage.googleapis.com/v1beta/files/...'
             # We need the file name which is the last part of the path
             file_name = video_uri.split('/')[-1].split(':')[0]
             
             print(f"✅ Video generated successfully!")
             print(f"📥 Downloading video {file_name}...")
             
             try:
                 video_bytes = client.files.download(file=file_name)
                 output_file = "innovation_video.mp4"
                 with open(output_file, "wb") as f:
                     f.write(video_bytes)
                 print(f"💾 Video saved as {output_file}")
                 print(f"🔗 Public path (if applicable): {os.path.abspath(output_file)}")
             except Exception as download_error:
                 print(f"❌ Could not download video: {download_error}")
                 print(f"🔗 Video URI (auth required): {video_uri}")
        else:
             print(f"✅ Video generated successfully! Result: {result}")

    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    generate_video()
