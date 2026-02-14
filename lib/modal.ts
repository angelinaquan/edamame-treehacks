const MODAL_BASE_URL =
  process.env.MODAL_BASE_URL || "http://localhost:8000";

export async function callModalEndpoint<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${MODAL_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Modal endpoint ${endpoint} failed: ${response.statusText}`
    );
  }

  return response.json();
}

export async function runCloneBrain(params: {
  clone_id: string;
  message: string;
  conversation_history: { role: string; content: string }[];
  system_prompt: string;
}): Promise<{
  response: string;
  reasoning: string[];
  tool_calls: unknown[];
}> {
  return callModalEndpoint("/agent/run", params);
}

export async function embedText(text: string): Promise<number[]> {
  return callModalEndpoint("/embed", { text });
}

export async function transcribeAudioModal(
  audioBase64: string
): Promise<string> {
  const result = await callModalEndpoint<{ text: string }>(
    "/stt/transcribe",
    { audio: audioBase64 }
  );
  return result.text;
}

export async function synthesizeSpeechModal(
  text: string
): Promise<string> {
  const result = await callModalEndpoint<{ audio: string }>(
    "/tts/synthesize",
    { text }
  );
  return result.audio;
}
