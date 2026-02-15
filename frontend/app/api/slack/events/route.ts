import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { getActiveCloneId, getSlackBotToken } from "@/lib/integrations/credentials";
import { generateEmbedding } from "@/lib/agents/openai";
import { extractFacts, learnFromConversation } from "@backend/memory";

/**
 * POST /api/slack/events
 *
 * Slack Events API webhook endpoint.
 * Receives real-time events from Slack (e.g. new messages) and ingests them
 * into the clone's memory with embeddings for continual learning.
 *
 * Setup:
 *  1. Connect Slack via the Settings page (stores bot_token in integration_credentials)
 *  2. In your Slack App dashboard → Event Subscriptions → set Request URL to:
 *       https://<your-domain>/api/slack/events
 *  3. Subscribe to bot events: message.channels, message.groups
 *  4. Slack will send a url_verification challenge first, then real events.
 */

// Slack event payload types
interface SlackEventPayload {
  type: string;
  token?: string;
  challenge?: string;
  event?: SlackMessageEvent;
  event_id?: string;
}

interface SlackMessageEvent {
  type: string;
  subtype?: string;
  text?: string;
  user?: string;
  channel?: string;
  channel_type?: string;
  ts?: string;
  bot_id?: string;
}

// Simple in-memory set to deduplicate events (Slack can retry)
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 500;

function trackEvent(eventId: string): boolean {
  if (processedEvents.has(eventId)) return false; // already processed
  processedEvents.add(eventId);
  // Prevent unbounded memory growth
  if (processedEvents.size > MAX_PROCESSED_EVENTS) {
    const first = processedEvents.values().next().value;
    if (first) processedEvents.delete(first);
  }
  return true;
}

/**
 * Resolve a single Slack user ID to a display name using the Slack API.
 */
async function resolveUserName(
  token: string,
  userId: string
): Promise<string> {
  try {
    const url = new URL("https://slack.com/api/users.info");
    url.searchParams.set("user", userId);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.ok) return userId;
    const profile = data.user?.profile as Record<string, string> | undefined;
    return (
      profile?.display_name ||
      profile?.real_name ||
      (data.user?.name as string) ||
      userId
    );
  } catch {
    return userId;
  }
}

/**
 * Resolve a Slack channel ID to a channel name.
 */
async function resolveChannelName(
  token: string,
  channelId: string
): Promise<string> {
  try {
    const url = new URL("https://slack.com/api/conversations.info");
    url.searchParams.set("channel", channelId);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.ok) return channelId;
    return (data.channel?.name as string) || channelId;
  } catch {
    return channelId;
  }
}

/**
 * Process a Slack message event: save to memory with embeddings + extract facts.
 * Runs as fire-and-forget so we can respond to Slack within 3 seconds.
 */
async function processSlackMessage(event: SlackMessageEvent): Promise<void> {
  const text = event.text?.trim();
  if (!text || text.length < 5) return; // skip empty/trivial messages

  const channelId = event.channel || "unknown";
  const userId = event.user || "unknown";
  const timestamp = event.ts
    ? new Date(parseFloat(event.ts) * 1000).toISOString()
    : new Date().toISOString();

  // Get bot token from integration_credentials (set via Settings page)
  let botToken: string;
  try {
    botToken = await getSlackBotToken();
  } catch {
    console.error("[slack-events] No Slack bot token found. Connect Slack via Settings page.");
    return;
  }

  // Resolve names in parallel
  const [senderName, channelName] = await Promise.all([
    resolveUserName(botToken, userId),
    resolveChannelName(botToken, channelId),
  ]);

  // Build the memory content
  const memoryContent = `[Slack #${channelName}] ${senderName}: ${text}`;
  const cloneId = await getActiveCloneId();
  const supabase = createServerSupabaseClient();

  // Generate embedding for the message
  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(memoryContent);
  } catch {
    // Continue without embedding — keyword search will still find it
  }

  // Save as a document memory (the raw Slack message)
  const docRow: Record<string, unknown> = {
    clone_id: cloneId,
    type: "document",
    source: "slack",
    content: memoryContent,
    confidence: 0.9,
    metadata: {
      title: `Slack: #${channelName} message`,
      doc_type: "slack_message",
      channel_id: channelId,
      channel_name: channelName,
      sender_id: userId,
      sender_name: senderName,
      slack_ts: event.ts,
      ingestion_type: "webhook",
    },
    occurred_at: timestamp,
  };

  // Also save as a chunk (same content, but with embedding for vector search)
  const chunkRow: Record<string, unknown> = {
    clone_id: cloneId,
    type: "chunk",
    source: "slack",
    content: memoryContent,
    confidence: 0.85,
    metadata: {
      source_type: "slack_webhook",
      channel_id: channelId,
      channel_name: channelName,
      sender_id: userId,
      sender_name: senderName,
      document_title: `Slack: #${channelName}`,
    },
    occurred_at: timestamp,
  };

  if (embedding) {
    chunkRow.embedding = JSON.stringify(embedding);
  }

  // Insert document + chunk
  const { error: insertError } = await supabase
    .from("memories")
    .insert([docRow, chunkRow]);

  if (insertError) {
    console.error("[slack-events] Failed to save Slack message:", insertError.message);
    return;
  }

  // Continual learning: extract facts and save with dedup
  const convId = `slack_${channelId}_${event.ts || Date.now()}`;
  try {
    const result = await learnFromConversation(cloneId, text, convId, "slack");
    if (result.factsExtracted > 0) {
      console.log(
        `[slack-events] Learned from Slack: ${result.factsSaved} new facts, ${result.factsReinforced} reinforced`
      );
    }
  } catch (err) {
    console.error("[slack-events] Fact extraction failed:", err);
  }

  console.log(
    `[slack-events] Ingested: [#${channelName}] ${senderName}: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`
  );
}

// ---- Route handler ----

export async function POST(request: NextRequest) {
  let body: SlackEventPayload;
  try {
    body = (await request.json()) as SlackEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. Handle Slack URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // 2. Handle event callbacks
  if (body.type === "event_callback" && body.event) {
    const event = body.event;

    // Only process actual user messages (not bot messages, not subtypes like edits/joins)
    if (event.type !== "message" || event.subtype || event.bot_id) {
      return NextResponse.json({ ok: true });
    }

    // Deduplicate (Slack retries if we don't respond fast enough)
    const eventId = body.event_id || `${event.channel}_${event.ts}`;
    if (!trackEvent(eventId)) {
      return NextResponse.json({ ok: true }); // already processed
    }

    // Respond immediately (Slack requires response within 3 seconds)
    // Process the message in the background
    processSlackMessage(event).catch((err) =>
      console.error("[slack-events] Background processing failed:", err)
    );

    return NextResponse.json({ ok: true });
  }

  // Unknown event type
  return NextResponse.json({ ok: true });
}
