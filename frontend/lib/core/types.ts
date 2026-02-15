export type UserRole = "owner" | "manager" | "member";
export type CloneStatus = "untrained" | "training" | "active" | "inactive";
export type ConversationMode = "text" | "voice";
export type MessageRole = "user" | "assistant" | "system";
export type DocType =
  | "slack_message"
  | "document"
  | "meeting_notes"
  | "email"
  | "notion_page"
  | "github_commit"
  | "jira_ticket"
  | "gdrive_doc";
export type IntegrationSource =
  | "slack"
  | "notion"
  | "github"
  | "jira"
  | "gdrive"
  | "email"
  | "voice";
export type MemoryModality = "text" | "audio" | "image" | "video";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface Clone {
  id: string;
  org_id: string;
  owner_id: string;
  name: string;
  avatar_url?: string;
  personality: ClonePersonality;
  expertise_tags: string[];
  status: CloneStatus;
  created_at: string;
  trained_at?: string;
}

export interface ClonePersonality {
  communication_style: "direct" | "detailed" | "casual" | "formal";
  tone: string;
  bio: string;
  expertise_areas: string[];
}

export interface Document {
  id: string;
  clone_id: string;
  title: string;
  content: string;
  file_url?: string;
  doc_type: DocType;
  created_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  clone_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  clone_id: string;
  user_id: string;
  title: string;
  mode: ConversationMode;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  metadata?: MessageMetadata;
  created_at: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface MessageMetadata {
  clone_consultations?: CloneConsultation[];
  sources?: string[];
  thinking_steps?: string[];
}

export interface CloneConsultation {
  target_clone_id: string;
  target_clone_name: string;
  query: string;
  response: string;
  latency_ms: number;
}

export interface CloneInteraction {
  id: string;
  conversation_id: string;
  caller_clone_id: string;
  target_clone_id: string;
  query: string;
  response: string;
  depth: number;
  latency_ms: number;
  created_at: string;
}

export interface Memory {
  id: string;
  clone_id: string;
  fact: string;
  source_conversation_id?: string;
  confidence: number;
  created_at: string;
}

export interface BaseSourceMetadata {
  source_type: IntegrationSource;
  source_url?: string;
}

export interface SlackSourceMetadata extends BaseSourceMetadata {
  source_type: "slack";
  channel_id: string;
  channel_name: string;
  thread_ts?: string;
  sender_id: string;
  mentions: string[];
  reactions: string[];
}

export interface NotionSourceMetadata extends BaseSourceMetadata {
  source_type: "notion";
  page_id: string;
  workspace_id: string;
  last_edited_by: string;
  path: string[];
}

export interface GithubSourceMetadata extends BaseSourceMetadata {
  source_type: "github";
  repo: string;
  commit_sha: string;
  pr_number?: number;
  author: string;
  branch: string;
  files_changed: string[];
}

export interface GenericSourceMetadata extends BaseSourceMetadata {
  source_type: "jira" | "gdrive" | "email" | "voice";
}

export type MemorySourceMetadata =
  | SlackSourceMetadata
  | NotionSourceMetadata
  | GithubSourceMetadata
  | GenericSourceMetadata;

export interface MemoryResource {
  id: string;
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
  source_metadata: MemorySourceMetadata | Record<string, unknown>;
  raw_payload: Record<string, unknown>;
  created_at: string;
}

export interface MemoryResourceInput
  extends Omit<MemoryResource, "id" | "created_at"> {}

export type MemoryCompactionState =
  | "active"
  | "weekly_summarized"
  | "monthly_rewound";

export interface MemoryItem {
  id: string;
  clone_id: string;
  resource_id: string;
  fact: string;
  normalized_fact?: string;
  category_key?: string;
  source_type: IntegrationSource;
  importance: number;
  confidence: number;
  occurred_at: string;
  metadata: Record<string, unknown>;
  compaction_state: MemoryCompactionState;
  created_at: string;
}

export interface MemoryItemInput extends Omit<MemoryItem, "id" | "created_at"> {}

export type MemoryCategoryType = "topic" | "person" | "project" | "timeline";

export interface MemoryCategory {
  id: string;
  clone_id: string;
  category_type: MemoryCategoryType;
  category_key: string;
  summary: string;
  item_count: number;
  confidence: number;
  time_window_start?: string;
  time_window_end?: string;
  last_item_at?: string;
  is_monthly_snapshot: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MemoryCategoryInput
  extends Omit<MemoryCategory, "id" | "created_at" | "updated_at"> {}

export type MemoryRunStatus = "running" | "completed" | "failed";
export type MemoryRunTrigger = "manual" | "scheduled" | "mcp_sync";

export interface MemoryRun {
  id: string;
  clone_id: string;
  trigger_type: MemoryRunTrigger;
  seed?: string;
  sources: IntegrationSource[];
  status: MemoryRunStatus;
  resources_count: number;
  items_count: number;
  categories_count: number;
  projected_documents_count: number;
  projected_chunks_count: number;
  projected_memories_count: number;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface SyntheticGenerationOptions {
  cloneId: string;
  seed?: string | number;
  dateRange?: {
    start: string;
    end: string;
  };
  volume?: "small" | "medium" | "large";
  sources?: ("slack" | "notion" | "github")[];
}

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
