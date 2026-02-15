import { google, drive_v3 } from "googleapis";
import { chunkText } from "@/lib/chunker";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

function createGoogleAuth(): InstanceType<typeof google.auth.GoogleAuth> {
  const scopes = ["https://www.googleapis.com/auth/drive.readonly"];
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;

  if (serviceAccountJson) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountJson) as Record<string, unknown>,
      scopes,
    });
  }

  return new google.auth.GoogleAuth({
    keyFile: keyFile || "service-account.json",
    scopes,
  });
}

function createDriveClient(): drive_v3.Drive {
  const auth = createGoogleAuth();
  return google.drive({
    version: "v3",
    auth,
  });
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
  const drive = createDriveClient();
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
  const drive = createDriveClient();
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

  const snapshotInsert = await supabase
    .from("google_drive_context_snapshots")
    .insert({
      clone_id: opts.cloneId,
      query: opts.query ?? null,
      payload: context,
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

  const documentInsert = await supabase
    .from("documents")
    .insert(
      context.files.map((file) => ({
        clone_id: opts.cloneId,
        title: `Google Drive: ${file.name}`,
        content:
          `Google Drive file snapshot\n` +
          `File name: ${file.name}\n` +
          `File ID: ${file.file_id}\n` +
          `MIME type: ${file.mime_type}\n` +
          `Owners: ${file.owners.join(", ") || "Unknown"}\n` +
          `URL: ${file.web_view_link ?? "N/A"}\n` +
          `Modified: ${file.modified_time ?? "N/A"}\n\n` +
          `${file.content}`,
        doc_type: "google_drive_file",
        file_url: file.web_view_link,
      }))
    )
    .select("id, title, content");

  if (documentInsert.error || !documentInsert.data) {
    throw new Error(
      `Failed to save Google Drive documents: ${documentInsert.error?.message ?? "unknown error"}`
    );
  }

  const chunkRows: {
    document_id: string;
    clone_id: string;
    content: string;
    metadata: Record<string, unknown>;
  }[] = [];

  const documents = documentInsert.data as {
    id: string;
    title: string;
    content: string | null;
  }[];

  documents.forEach((document, index) => {
    const rawContent = document.content ?? "";
    if (!rawContent.trim()) return;
    const sourceFile = context.files[index];
    const chunks = chunkText(rawContent, { chunkSize: 700, overlap: 100 });
    chunks.forEach((chunk) => {
      chunkRows.push({
        document_id: document.id,
        clone_id: opts.cloneId,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          source: "google_drive",
          source_type: "file_snapshot",
          snapshot_id: snapshotId,
          google_file_id: sourceFile?.file_id ?? null,
          google_file_name: sourceFile?.name ?? null,
          google_file_mime_type: sourceFile?.mime_type ?? null,
          google_file_url: sourceFile?.web_view_link ?? null,
          document_title: document.title,
        },
      });
    });
  });

  if (chunkRows.length > 0) {
    const chunkInsert = await supabase.from("chunks").insert(chunkRows);
    if (chunkInsert.error) {
      throw new Error(
        `Failed to save Google Drive chunks: ${chunkInsert.error.message}`
      );
    }
  }

  return {
    snapshot_id: snapshotId,
    files_scanned: context.files_scanned,
    documents_created: documents.length,
    chunks_created: chunkRows.length,
  };
}
