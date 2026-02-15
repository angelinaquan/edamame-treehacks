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

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const openai = getOpenAIClient();
  const uint8 = new Uint8Array(audioBuffer);
  const file = new File([uint8], "audio.webm", { type: "audio/webm" });
  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
  });
  return transcription.text;
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
