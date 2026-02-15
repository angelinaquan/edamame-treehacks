import OpenAI from "openai";
import { toFile } from "openai/uploads";

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

  // Always materialise into a fresh File from a Buffer to avoid stale
  // stream / blob issues with the OpenAI SDK on repeated calls.
  let bytes: Uint8Array;
  let fileName: string;
  let mimeType: string;

  if (audioInput instanceof File) {
    const ab = await audioInput.arrayBuffer();
    bytes = new Uint8Array(ab);
    fileName = audioInput.name || "audio.webm";
    mimeType = audioInput.type || "audio/webm";
  } else {
    bytes = new Uint8Array(audioInput);
    fileName = "audio.webm";
    mimeType = "audio/webm";
  }

  // Strip codec parameters (e.g. "audio/webm;codecs=opus" → "audio/webm")
  // because the OpenAI Whisper API rejects MIME types with codec suffixes.
  const cleanMime = mimeType.split(";")[0].trim();

  const uploadFile = await toFile(bytes, fileName, { type: cleanMime });

  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: uploadFile,
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
