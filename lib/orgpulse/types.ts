// ============================================
// OrgPulse — Type Definitions
// ============================================

export interface Employee {
  id: string;
  name: string;
  role: string;
  team: string;
  tenure: string;
  initials: string;
}

export type Stance = "support" | "neutral" | "oppose";

export interface Citation {
  source: string;
  snippet: string;
  date: string;
}

export interface EmployeeResponse {
  employee: Employee;
  stance: Stance;
  confidence: number;
  summary: string;
  reasoning: string;
  citations: Citation[];
}

export interface Theme {
  id: string;
  label: string;
  count: number;
  dominantStance: Stance;
  description: string;
  employeeIds: string[];
}

export interface StanceDistribution {
  support: number;
  neutral: number;
  oppose: number;
}

export interface AggregationResult {
  distribution: StanceDistribution;
  overallConfidence: number;
  themes: Theme[];
  totalResponses: number;
  summary: string;
}

export interface QueryPlan {
  question: string;
  targetTeams: string[];
  estimatedResponses: number;
  steps: string[];
}

export type StreamStage =
  | "idle"
  | "planning"
  | "querying"
  | "aggregating"
  | "complete";

export type InsightEvent =
  | { type: "stage"; stage: StreamStage; message: string }
  | { type: "plan"; plan: QueryPlan }
  | { type: "employee_response"; response: EmployeeResponse }
  | { type: "aggregation"; data: AggregationResult };

export interface InsightsFilters {
  teams: string[];
  scenario: string | null;
}

export interface DeltaResult {
  previousDistribution: StanceDistribution;
  currentDistribution: StanceDistribution;
  supportDelta: number;
  neutralDelta: number;
  opposeDelta: number;
  summary: string;
}

// ---- Knowledge types ----

export interface OnboardingBrief {
  role: string;
  team: string;
  generatedAt: string;
  keyContext: string[];
  keyPeople: {
    name: string;
    role: string;
    relationship: string;
    tip: string;
  }[];
  keyDocs: {
    title: string;
    type: string;
    url: string;
    relevance: string;
  }[];
  decisions: {
    decision: string;
    date: string;
    rationale: string;
    participants: string[];
  }[];
  risks: {
    risk: string;
    severity: "low" | "medium" | "high";
    context: string;
  }[];
}

export type MemoryType = "episodic" | "semantic";

export interface MemoryItem {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  timestamp: string;
  tags: string[];
  team: string;
  citations: Citation[];
}

export interface HandoffPack {
  employee: Employee;
  generatedAt: string;
  ownershipAreas: {
    area: string;
    description: string;
    status: "active" | "transitioning" | "needs-owner";
    suggestedOwner?: string;
  }[];
  keyLinks: { title: string; url: string; category: string }[];
  unresolvedWork: {
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    description: string;
    deadline?: string;
  }[];
  summaryBullets: string[];
}

// ---- Agent Clone types ----

export interface CloneProfile {
  employee: Employee;
  personality: string;
  expertise: string[];
  suggestedQuestions: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
}
