export type UserRole = "owner" | "manager" | "member";
export type CloneStatus = "untrained" | "training" | "active" | "inactive";
export type ConversationMode = "text" | "voice";
export type MessageRole = "user" | "assistant" | "system";

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
  doc_type:
    | "slack_message"
    | "document"
    | "meeting_notes"
    | "email"
    | "notion_page"
    | "google_drive_file";
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
