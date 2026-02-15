import OpenAI from "openai";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please add it to your .env.local file."
    );
  }
  return new OpenAI({ apiKey });
}

export default getOpenAIClient;

export async function transcribeAudio(audioInput: File | Buffer): Promise<string> {
  const openai = getOpenAIClient();
  const file =
    audioInput instanceof File
      ? audioInput
      : new File([new Uint8Array(audioInput)], "audio.webm", {
          type: "audio/webm",
        });
  // Pass the raw File directly to preserve original codec/container metadata.
  // whisper-1 handles webm/opus, ogg, mp4, mp3, wav natively.
  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "en",
  });
  return transcription.text.trim();
}

export async function synthesizeSpeech(text: string): Promise<Uint8Array> {
  const openai = getOpenAIClient();
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text,
    response_format: "mp3",
  });
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}
