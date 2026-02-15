"""Text-to-speech using OpenAI TTS."""
import os
import base64


def synthesize_speech(text: str, voice: str = "nova") -> str:
    import openai
    client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    response = client.audio.speech.create(
        model="tts-1", voice=voice, input=text, response_format="mp3",
    )
    audio_bytes = response.content
    return base64.b64encode(audio_bytes).decode("utf-8")
