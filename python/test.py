import re
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_url):
    try:
        # 1. Extract 11-character Video ID safely
        video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", video_url)
        if not video_id_match:
            return "Error: Could not extract Video ID"
        video_id = video_id_match.group(1)

        # 2. Use the modern fetch approach (required in latest 2026 versions)
        # By default, this prioritizes manual transcripts over auto-generated ones
        ytt_api = YouTubeTranscriptApi()
        transcript_obj = ytt_api.fetch(video_id)

        # 3. Handle data based on how the library returns it
        # If the object is subscriptable (old), use ['text']
        # If it's a new 'FetchedTranscriptSnippet', use .text attribute
        try:
            full_text = " ".join([item.text for item in transcript_obj])
        except AttributeError:
            # Fallback for older versions or raw dictionary outputs
            full_text = " ".join([item['text'] for item in transcript_obj])

        return full_text

    except Exception as e:
        return f"Error: {str(e)}"

# Usage for your TubeToMD platform
# print(get_transcript("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
# print(get_transcript("https://youtu.be/d1TXKKsxUaA"))



def get_transcript_with_timestamps(video_url):
    try:
        video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", video_url)
        if not video_id_match:
            return "Error: Could not extract Video ID"
        video_id = video_id_match.group(1)

        # Fetch the transcript data
        transcript_obj = YouTubeTranscriptApi().fetch(video_id)

        formatted_lines = []
        for item in transcript_obj:
            # item.start gives the time in seconds
            start_time = int(item.start) 
            
            # Convert seconds to M:SS or H:MM:SS format
            minutes = start_time // 60
            seconds = start_time % 60
            timestamp = f"[{minutes}:{seconds:02d}]"
            
            # Handle object-attribute access (item.text) or dictionary access (item['text'])
            try:
                text = item.text
            except AttributeError:
                text = item['text']
                
            formatted_lines.append(f"{timestamp} {text}")

        return "\n".join(formatted_lines)

    except Exception as e:
        return f"Error: {str(e)}"

# Usage for TubeToMD
print(get_transcript_with_timestamps("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))