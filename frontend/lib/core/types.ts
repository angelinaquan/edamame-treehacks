export type CloneStatus = "untrained" | "training" | "active" | "inactive";
export type MessageRole = "user" | "assistant" | "system";
export type MemoryType = "document" | "chunk" | "fact" | "snapshot" | "category";
export type MemorySource =
  | "slack"
  | "notion"
  | "github"
  | "gdrive"
  | "email"
  | "voice"
  | "conversation"
  | "manual";

// Keep IntegrationSource as an alias for backward compat in integration files
export type IntegrationSource = "slack" | "notion" | "github" | "jira" | "gdrive" | "email" | "voice";

export interface Clone {
  id: string;
  name: string;
  avatar_url?: string;
  personality: ClonePersonality;
  expertise_tags: string[];
  status: CloneStatus;
  owner_name?: string;
  owner_email?: string;
  owner_role?: string;
  owner_department?: string;
  /** @deprecated Used only by mock data to link to mock people */
  owner_id?: string;
  created_at: string;
  trained_at?: string;
}

export interface ClonePersonality {
  communication_style: "direct" | "detailed" | "casual" | "formal";
  tone: string;
  bio: string;
  expertise_areas: string[];
}

// Unified memory row — all knowledge lives here
export interface Memory {
  id: string;
  clone_id: string;
  type: MemoryType;
  source: MemorySource;
  content: string;
  confidence: number;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface MemoryInput extends Omit<Memory, "id" | "created_at"> {}

// Convenience accessors for metadata fields used across the codebase
export function memoryFact(m: Memory): string {
  return m.content;
}
export function memoryTitle(m: Memory): string | undefined {
  return m.metadata.title as string | undefined;
}
export function memoryDocType(m: Memory): string | undefined {
  return m.metadata.doc_type as string | undefined;
}

// Flat message row
export interface Message {
  id: string;
  clone_id?: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
  created_at: string;
}

export interface MessageMetadata {
  clone_consultations?: CloneConsultation[];
  sources?: string[];
  thinking_steps?: string[];
  reasoning?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface CloneConsultation {
  target_clone_id: string;
  target_clone_name: string;
  query: string;
  response: string;
  latency_ms: number;
}

// Legacy type aliases for backward compatibility during migration
export type DocType =
  | "slack_message"
  | "document"
  | "meeting_notes"
  | "email"
  | "notion_page"
  | "github_commit"
  | "jira_ticket"
  | "gdrive_doc";
export type MemoryModality = "text" | "audio" | "image" | "video";

// Chunk type (used as a return shape in some code paths)
export interface Chunk {
  id: string;
  clone_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  score?: number;
  document_id?: string;
}

// Input type for synthetic resource generation (used by ingest pipeline)
export interface MemoryResourceInput {
  clone_id: string;
  source_type: IntegrationSource;
  external_id: string;
  title?: string;
  author?: string;
  content: string;
  occurred_at: string;
  modality: MemoryModality;
  media_url?: string;
  transcript?: string;
  source_metadata: Record<string, unknown>;
  raw_payload?: Record<string, unknown>;
}

export interface SyntheticGenerationOptions {
  cloneId: string;
  seed?: string | number;
  dateRange?: {
    start: string;
    end: string;
  };
  volume?: "small" | "medium" | "large";
  sources?: ("slack" | "notion" | "github" | "jira" | "gdrive" | "email")[];
}

// Mock data types (meetings, people, reminders — used by clone-brain)
export interface Meeting {
  id: string;
  title: string;
  date: string;
  attendees: MeetingAttendee[];
  summary: string;
  discussion_points: DiscussionPoint[];
  action_items: ActionItem[];
  sentiment: "positive" | "neutral" | "mixed" | "tense";
}

export interface MeetingAttendee {
  name: string;
  role: string;
  avatar_url?: string;
}

export interface DiscussionPoint {
  topic: string;
  summary: string;
  speaker?: string;
}

export interface ActionItem {
  description: string;
  assignee: string;
  due_date?: string;
  status: "pending" | "in_progress" | "done";
}

export interface PersonContext {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar_url?: string;
  recent_interactions: string[];
  relationship: string;
  key_facts: string[];
}

export interface ProactiveReminder {
  id: string;
  type: "meeting_debrief" | "follow_up" | "deadline";
  title: string;
  description: string;
  meeting_id?: string;
  people: string[];
  priority: "high" | "medium" | "low";
  triggered: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isRecording: boolean;
  isPlayingAudio: boolean;
  activeConsultations: CloneConsultation[];
  thinkingSteps: string[];
}
