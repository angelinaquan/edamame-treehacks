import { chunkText } from "@/lib/core/chunker";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { getSlackBotToken } from "./credentials";
import { generateEmbeddings } from "@/lib/agents/openai";

/* ---------- Types ---------- */

export interface SlackMessageData {
  content: string;
  sender: string;
  timestamp: string;
  channel: string;
  channel_name: string;
}

export interface SlackChannelInfo {
  id: string;
  name: string;
  is_member: boolean;
  num_members: number;
  topic: string;
  purpose: string;
}

export interface SlackSyncResult {
  snapshot_id: string;
  channels_scanned: number;
  messages_fetched: number;
  documents_created: number;
  chunks_created: number;
}

/* ---------- OAuth helpers (kept for the OAuth flow) ---------- */

export function getSlackAuthUrl(redirectUri: string): string {
  const clientId = process.env.SLACK_CLIENT_ID || "";
  const scopes = "channels:history,channels:read,users:read";
  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function exchangeSlackCode(
  code: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || "",
      client_secret: process.env.SLACK_CLIENT_SECRET || "",
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await response.json();
  return data.access_token;
}

/* ---------- Slack Web API helpers ---------- */

async function slackApi(
  method: string,
  token: string,
  params: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error (${method}): ${data.error ?? "unknown"}`);
  }
  return data;
}

/** List channels the bot has access to. */
export async function listSlackChannels(
  token: string
): Promise<SlackChannelInfo[]> {
  const channels: SlackChannelInfo[] = [];
  let cursor = "";

  do {
    const params: Record<string, string> = {
      types: "public_channel",
      exclude_archived: "true",
      limit: "200",
    };
    if (cursor) params.cursor = cursor;

    const data = await slackApi("conversations.list", token, params);
    const rawChannels = (data.channels ?? []) as Array<Record<string, unknown>>;

    for (const ch of rawChannels) {
      channels.push({
        id: ch.id as string,
        name: ch.name as string,
        is_member: ch.is_member as boolean,
        num_members: (ch.num_members as number) ?? 0,
        topic: ((ch.topic as Record<string, string>)?.value ?? ""),
        purpose: ((ch.purpose as Record<string, string>)?.value ?? ""),
      });
    }

    const meta = data.response_metadata as Record<string, string> | undefined;
    cursor = meta?.next_cursor ?? "";
  } while (cursor);

  return channels;
}

/** Fetch recent messages from a single channel. */
export async function fetchSlackMessages(
  accessToken: string,
  channelId: string,
  limit = 200
): Promise<SlackMessageData[]> {
  const data = await slackApi("conversations.history", accessToken, {
    channel: channelId,
    limit: String(Math.min(limit, 1000)),
  });

  const messages = (data.messages ?? []) as Array<Record<string, string>>;

  return messages.map((msg) => ({
    content: msg.text ?? "",
    sender: msg.user ?? "unknown",
    timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
    channel: channelId,
    channel_name: "", // filled in by caller
  }));
}

/** Resolve user IDs to display names (best-effort). */
async function resolveUserNames(
  token: string,
  userIds: string[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const unique = [...new Set(userIds)];

  for (const userId of unique) {
    try {
      const data = await slackApi("users.info", token, { user: userId });
      const user = data.user as Record<string, unknown> | undefined;
      const profile = user?.profile as Record<string, string> | undefined;
      map[userId] =
        profile?.display_name || profile?.real_name || (user?.name as string) || userId;
    } catch {
      map[userId] = userId;
    }
  }

  return map;
}

/* ---------- Build a text document from a channel's messages ---------- */

function buildChannelDocument(
  channelInfo: SlackChannelInfo,
  messages: SlackMessageData[],
  userNames: Record<string, string>
): { title: string; content: string } {
  const header = `Slack channel: #${channelInfo.name}
Topic: ${channelInfo.topic || "None"}
Purpose: ${channelInfo.purpose || "None"}
Members: ${channelInfo.num_members}
Messages fetched: ${messages.length}
`;

  const messageLines = messages
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((m) => {
      const name = userNames[m.sender] ?? m.sender;
      const time = m.timestamp;
      return `[${time}] ${name}: ${m.content}`;
    })
    .join("\n");

  return {
    title: `Slack: #${channelInfo.name}`,
    content: `${header}\n--- Messages ---\n${messageLines}`,
  };
}

/* ---------- Full sync: channels → messages → Supabase ---------- */

export async function syncSlackContextToSupabase(opts: {
  cloneId: string;
  channelLimit?: number;
  messagesPerChannel?: number;
}): Promise<SlackSyncResult> {
  const token = await getSlackBotToken();
  const channelLimit = opts.channelLimit ?? 20;
  const messagesPerChannel = opts.messagesPerChannel ?? 200;

  // 1. List channels the bot is in
  const allChannels = await listSlackChannels(token);
  const memberChannels = allChannels
    .filter((ch) => ch.is_member)
    .slice(0, channelLimit);

  if (memberChannels.length === 0) {
    throw new Error(
      "The Slack bot is not a member of any channels. Invite the bot to channels first."
    );
  }

  // 2. Fetch messages from each channel
  const channelDocs: { channel: SlackChannelInfo; messages: SlackMessageData[] }[] = [];
  const allUserIds: string[] = [];

  for (const channel of memberChannels) {
    const messages = await fetchSlackMessages(token, channel.id, messagesPerChannel);
    messages.forEach((m) => {
      m.channel_name = channel.name;
    });
    channelDocs.push({ channel, messages });
    allUserIds.push(...messages.map((m) => m.sender));
  }

  // 3. Resolve user names
  const userNames = await resolveUserNames(token, allUserIds);

  // 4. Build text documents
  const docs = channelDocs.map(({ channel, messages }) =>
    buildChannelDocument(channel, messages, userNames)
  );

  const totalMessages = channelDocs.reduce(
    (sum, cd) => sum + cd.messages.length,
    0
  );

  // 5. Save snapshot + documents + chunks into unified memories table
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const snapshotPayload = {
    channels_scanned: memberChannels.length,
    messages_fetched: totalMessages,
    generated_at: now,
    channels: memberChannels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      num_members: ch.num_members,
    })),
  };

  const snapshotInsert = await supabase
    .from("memories")
    .insert({
      clone_id: opts.cloneId,
      type: "snapshot",
      source: "slack",
      content: JSON.stringify(snapshotPayload),
      confidence: 1.0,
      metadata: snapshotPayload,
      occurred_at: now,
    })
    .select("id")
    .single();

  if (snapshotInsert.error || !snapshotInsert.data) {
    throw new Error(
      `Failed to save Slack snapshot: ${snapshotInsert.error?.message ?? "unknown error"}`
    );
  }

  const snapshotId = snapshotInsert.data.id as string;

  if (docs.length === 0) {
    return {
      snapshot_id: snapshotId,
      channels_scanned: 0,
      messages_fetched: 0,
      documents_created: 0,
      chunks_created: 0,
    };
  }

  // 6. Insert documents + chunks as memories
  const memoryRows: Array<{
    clone_id: string;
    type: string;
    source: string;
    content: string;
    confidence: number;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }> = [];

  let chunksCreated = 0;
  for (const doc of docs) {
    memoryRows.push({
      clone_id: opts.cloneId,
      type: "document",
      source: "slack",
      content: doc.content,
      confidence: 0.9,
      metadata: { title: doc.title, doc_type: "slack_message", snapshot_id: snapshotId },
      occurred_at: now,
    });

    if (doc.content.trim()) {
      const textChunks = chunkText(doc.content, { chunkSize: 700, overlap: 100 });
      for (const chunk of textChunks) {
        memoryRows.push({
          clone_id: opts.cloneId,
          type: "chunk",
          source: "slack",
          content: chunk.content,
          confidence: 0.8,
          metadata: {
            ...chunk.metadata,
            source_type: "channel_messages",
            snapshot_id: snapshotId,
            document_title: doc.title,
          },
          occurred_at: now,
        });
        chunksCreated++;
      }
    }
  }

  // Generate embeddings for chunks (skip documents — too long)
  const chunkRows = memoryRows.filter((r) => r.type === "chunk");
  try {
    if (chunkRows.length > 0) {
      const embeddings = await generateEmbeddings(chunkRows.map((r) => r.content));
      let embIdx = 0;
      for (const row of memoryRows) {
        if (row.type === "chunk" && embIdx < embeddings.length) {
          (row as Record<string, unknown>).embedding = JSON.stringify(embeddings[embIdx]);
          embIdx++;
        }
      }
    }
  } catch (embErr) {
    console.warn("[slack-sync] Embedding generation failed, saving without embeddings:", embErr);
  }

  if (memoryRows.length > 0) {
    const { error } = await supabase.from("memories").insert(memoryRows);
    if (error) {
      throw new Error(`Failed to save Slack memories: ${error.message}`);
    }
  }

  return {
    snapshot_id: snapshotId,
    channels_scanned: memberChannels.length,
    messages_fetched: totalMessages,
    documents_created: docs.length,
    chunks_created: chunksCreated,
  };
}
