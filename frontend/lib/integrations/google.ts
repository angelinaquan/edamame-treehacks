import { google, drive_v3, gmail_v1 } from "googleapis";
import { chunkText } from "@/lib/core/chunker";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { getGoogleDriveCredentials, getGoogleOAuthTokens } from "./credentials";
import type { OAuth2Client } from "google-auth-library";

export interface GoogleDriveFileSnapshot {
  file_id: string;
  name: string;
  mime_type: string;
  modified_time: string | null;
  web_view_link: string | null;
  owners: string[];
  content: string;
}

export interface GoogleDriveContextSnapshot {
  query?: string;
  generated_at: string;
  files_scanned: number;
  files: GoogleDriveFileSnapshot[];
}

export interface GoogleDriveSyncResult {
  snapshot_id: string;
  files_scanned: number;
  documents_created: number;
  chunks_created: number;
}

/**
 * Creates a Google auth client.
 * Tries OAuth2 user tokens first (from integration_credentials).
 * Falls back to service account if no OAuth tokens are stored.
 */
async function createGoogleAuth(): Promise<OAuth2Client | InstanceType<typeof google.auth.GoogleAuth>> {
  // Try OAuth tokens first
  const oauthTokens = await getGoogleOAuthTokens();
  if (oauthTokens) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      access_token: oauthTokens.access_token,
      refresh_token: oauthTokens.refresh_token,
      expiry_date: oauthTokens.expiry_date,
    });
    return oauth2Client;
  }

  // Fallback to service account
  const scopes = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
  ];
  const creds = await getGoogleDriveCredentials();

  if (creds.serviceAccountJson) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(creds.serviceAccountJson) as Record<string, unknown>,
      scopes,
    });
  }

  return new google.auth.GoogleAuth({
    keyFile: creds.keyFile || "service-account.json",
    scopes,
  });
}

async function createDriveClient(): Promise<drive_v3.Drive> {
  const auth = await createGoogleAuth();
  return google.drive({ version: "v3", auth: auth as OAuth2Client });
}

async function createGmailClient(): Promise<gmail_v1.Gmail> {
  const auth = await createGoogleAuth();
  return google.gmail({ version: "v1", auth: auth as OAuth2Client });
}

function isTextLikeMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript" ||
    mimeType === "application/x-javascript"
  );
}

function decodeBufferContent(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf-8");
  if (Buffer.isBuffer(data)) return data.toString("utf-8");
  return "";
}

async function exportGoogleWorkspaceFileAsText(
  drive: drive_v3.Drive,
  fileId: string,
  mimeType: string
): Promise<string> {
  const exportMimeType =
    mimeType === "application/vnd.google-apps.spreadsheet"
      ? "text/csv"
      : "text/plain";

  const res = await drive.files.export(
    { fileId, mimeType: exportMimeType },
    { responseType: "arraybuffer" }
  );

  return decodeBufferContent(res.data);
}

async function readGoogleDriveFileContent(
  drive: drive_v3.Drive,
  file: drive_v3.Schema$File
): Promise<string> {
  const fileId = file.id ?? "";
  const mimeType = file.mimeType ?? "";
  if (!fileId || !mimeType) return "";

  if (mimeType.startsWith("application/vnd.google-apps.")) {
    try {
      return await exportGoogleWorkspaceFileAsText(drive, fileId, mimeType);
    } catch {
      return "";
    }
  }

  if (!isTextLikeMimeType(mimeType)) {
    return "";
  }

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return decodeBufferContent(res.data);
}

function getOwnerNames(file: drive_v3.Schema$File): string[] {
  return (file.owners ?? [])
    .map((owner) => owner.displayName ?? owner.emailAddress ?? "")
    .filter(Boolean);
}

export async function listDriveFiles(opts?: {
  query?: string;
  fileLimit?: number;
}): Promise<drive_v3.Schema$File[]> {
  const drive = await createDriveClient();
  const fileLimit = Math.min(Math.max(opts?.fileLimit ?? 25, 1), 100);

  const queryParts = ["trashed = false"];
  if (opts?.query?.trim()) {
    const safeQuery = opts.query.trim().replace(/'/g, "\\'");
    queryParts.push(`fullText contains '${safeQuery}'`);
  }

  const response = await drive.files.list({
    q: queryParts.join(" and "),
    pageSize: fileLimit,
    orderBy: "modifiedTime desc",
    fields:
      "files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName,emailAddress))",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files ?? [];
}

export async function buildGoogleDriveContext(opts?: {
  query?: string;
  fileLimit?: number;
}): Promise<GoogleDriveContextSnapshot> {
  const drive = await createDriveClient();
  const files = await listDriveFiles({
    query: opts?.query,
    fileLimit: opts?.fileLimit,
  });

  const snapshots: GoogleDriveFileSnapshot[] = [];
  for (const file of files) {
    const content = await readGoogleDriveFileContent(drive, file);
    snapshots.push({
      file_id: file.id ?? "",
      name: file.name ?? "Untitled file",
      mime_type: file.mimeType ?? "unknown",
      modified_time: file.modifiedTime ?? null,
      web_view_link: file.webViewLink ?? null,
      owners: getOwnerNames(file),
      content,
    });
  }

  return {
    query: opts?.query,
    generated_at: new Date().toISOString(),
    files_scanned: snapshots.length,
    files: snapshots,
  };
}

export async function syncGoogleDriveContextToSupabase(opts: {
  cloneId: string;
  query?: string;
  fileLimit?: number;
}): Promise<GoogleDriveSyncResult> {
  const context = await buildGoogleDriveContext({
    query: opts.query,
    fileLimit: opts.fileLimit,
  });
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const snapshotInsert = await supabase
    .from("memories")
    .insert({
      clone_id: opts.cloneId,
      type: "snapshot",
      source: "gdrive",
      content: JSON.stringify(context),
      confidence: 1.0,
      metadata: { query: opts.query, files_scanned: context.files_scanned },
      occurred_at: now,
    })
    .select("id")
    .single();

  if (snapshotInsert.error || !snapshotInsert.data) {
    throw new Error(
      `Failed to save Google Drive snapshot: ${snapshotInsert.error?.message ?? "unknown error"}`
    );
  }

  const snapshotId = snapshotInsert.data.id as string;
  if (context.files.length === 0) {
    return {
      snapshot_id: snapshotId,
      files_scanned: 0,
      documents_created: 0,
      chunks_created: 0,
    };
  }

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
  for (const file of context.files) {
    const docTitle = `Google Drive: ${file.name}`;
    const docContent =
      `Google Drive file snapshot\n` +
      `File name: ${file.name}\n` +
      `File ID: ${file.file_id}\n` +
      `MIME type: ${file.mime_type}\n` +
      `Owners: ${file.owners.join(", ") || "Unknown"}\n` +
      `URL: ${file.web_view_link ?? "N/A"}\n` +
      `Modified: ${file.modified_time ?? "N/A"}\n\n` +
      `${file.content}`;
    const occurredAt = file.modified_time || now;

    memoryRows.push({
      clone_id: opts.cloneId,
      type: "document",
      source: "gdrive",
      content: docContent,
      confidence: 0.9,
      metadata: {
        title: docTitle,
        doc_type: "google_drive_file",
        file_url: file.web_view_link,
        snapshot_id: snapshotId,
        google_file_id: file.file_id,
        google_file_name: file.name,
      },
      occurred_at: occurredAt,
    });

    if (docContent.trim()) {
      const chunks = chunkText(docContent, { chunkSize: 700, overlap: 100 });
      for (const chunk of chunks) {
        memoryRows.push({
          clone_id: opts.cloneId,
          type: "chunk",
          source: "gdrive",
          content: chunk.content,
          confidence: 0.8,
          metadata: {
            ...chunk.metadata,
            source_type: "file_snapshot",
            snapshot_id: snapshotId,
            google_file_id: file.file_id,
            google_file_name: file.name,
            document_title: docTitle,
          },
          occurred_at: occurredAt,
        });
        chunksCreated++;
      }
    }
  }

  if (memoryRows.length > 0) {
    const { error } = await supabase.from("memories").insert(memoryRows);
    if (error) {
      throw new Error(`Failed to save Google Drive memories: ${error.message}`);
    }
  }

  return {
    snapshot_id: snapshotId,
    files_scanned: context.files_scanned,
    documents_created: context.files.length,
    chunks_created: chunksCreated,
  };
}

// ============================================
// GMAIL INTEGRATION
// ============================================

export interface GmailMessageSnapshot {
  message_id: string;
  thread_id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labels: string[];
}

export interface GmailSyncResult {
  messages_fetched: number;
  documents_created: number;
  chunks_created: number;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractPlainTextBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  // Simple text/plain at top level
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart — recurse into parts
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Try nested multipart
    for (const part of payload.parts) {
      const nested = extractPlainTextBody(part);
      if (nested) return nested;
    }
  }

  return "";
}

export async function listGmailMessages(opts?: {
  query?: string;
  maxResults?: number;
}): Promise<GmailMessageSnapshot[]> {
  const gmail = await createGmailClient();
  const maxResults = Math.min(Math.max(opts?.maxResults ?? 50, 1), 200);

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: opts?.query || "",
    maxResults,
  });

  const messageIds = listRes.data.messages ?? [];
  if (messageIds.length === 0) return [];

  const snapshots: GmailMessageSnapshot[] = [];

  for (const msg of messageIds) {
    if (!msg.id) continue;
    try {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = full.data.payload?.headers;
      const body = extractPlainTextBody(full.data.payload);

      snapshots.push({
        message_id: full.data.id ?? "",
        thread_id: full.data.threadId ?? "",
        subject: getHeader(headers, "Subject"),
        from: getHeader(headers, "From"),
        to: getHeader(headers, "To"),
        date: getHeader(headers, "Date"),
        snippet: full.data.snippet ?? "",
        body: body.slice(0, 5000), // cap body at 5k chars
        labels: full.data.labelIds ?? [],
      });
    } catch {
      // skip messages we can't read
    }
  }

  return snapshots;
}

export async function syncGmailToSupabase(opts: {
  cloneId: string;
  query?: string;
  maxResults?: number;
}): Promise<GmailSyncResult> {
  const messages = await listGmailMessages({
    query: opts.query,
    maxResults: opts.maxResults,
  });
  const supabase = createServerSupabaseClient();

  if (messages.length === 0) {
    return { messages_fetched: 0, documents_created: 0, chunks_created: 0 };
  }

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
  for (const msg of messages) {
    const docTitle = `Gmail: ${msg.subject || "(no subject)"}`;
    const docContent =
      `Email message\n` +
      `Subject: ${msg.subject}\n` +
      `From: ${msg.from}\n` +
      `To: ${msg.to}\n` +
      `Date: ${msg.date}\n` +
      `Labels: ${msg.labels.join(", ")}\n\n` +
      `${msg.body}`;
    const occurredAt = msg.date || new Date().toISOString();

    memoryRows.push({
      clone_id: opts.cloneId,
      type: "document",
      source: "email",
      content: docContent,
      confidence: 0.9,
      metadata: {
        title: docTitle,
        doc_type: "email",
        gmail_message_id: msg.message_id,
        gmail_thread_id: msg.thread_id,
      },
      occurred_at: occurredAt,
    });

    if (docContent.trim()) {
      const chunks = chunkText(docContent, { chunkSize: 700, overlap: 100 });
      for (const chunk of chunks) {
        memoryRows.push({
          clone_id: opts.cloneId,
          type: "chunk",
          source: "email",
          content: chunk.content,
          confidence: 0.8,
          metadata: {
            ...chunk.metadata,
            source_type: "email_message",
            gmail_message_id: msg.message_id,
            gmail_thread_id: msg.thread_id,
            gmail_subject: msg.subject,
            gmail_from: msg.from,
            document_title: docTitle,
          },
          occurred_at: occurredAt,
        });
        chunksCreated++;
      }
    }
  }

  if (memoryRows.length > 0) {
    const { error } = await supabase.from("memories").insert(memoryRows);
    if (error) {
      throw new Error(`Failed to save Gmail memories: ${error.message}`);
    }
  }

  return {
    messages_fetched: messages.length,
    documents_created: messages.length,
    chunks_created: chunksCreated,
  };
}
