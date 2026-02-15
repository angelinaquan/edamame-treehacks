import type {
  Clone,
  Meeting,
  PersonContext,
  ProactiveReminder,
  Memory,
} from "@/lib/core/types";

// Local mock document type (the Document type was removed from core types)
interface MockDocument {
  id: string;
  clone_id: string;
  title: string;
  content: string;
  doc_type: string;
  created_at: string;
}

// ============================================
// PEOPLE / USERS
// ============================================
export const mockPeople: PersonContext[] = [
  {
    id: "user_self",
    name: "Alex Morgan",
    role: "VP of Product",
    department: "Product",
    avatar_url: "/avatars/alex.png",
    recent_interactions: [
      "Discussed Q1 pipeline strategy with Sarah yesterday",
      "Reviewed Jason's v3 architecture proposal last week",
      "Led the product roadmap sync on Monday",
    ],
    relationship: "This is you — the user of the platform",
    key_facts: [
      "Oversees all product development",
      "Reports directly to CEO",
      "Joined the company 2 years ago from Google",
      "Focuses on enterprise features",
    ],
  },
  {
    id: "user_sarah",
    name: "Sarah Chen",
    role: "VP of Sales",
    department: "Sales",
    avatar_url: "/avatars/sarah.png",
    recent_interactions: [
      "Led the Q1 Pipeline Review with Jason this morning",
      "Shared updated deal forecast with Alex yesterday",
      "Closed Acme Corp deal last week — $2.4M ARR",
    ],
    relationship: "Cross-functional partner, works closely on enterprise deals",
    key_facts: [
      "Top performer, exceeded Q4 targets by 140%",
      "Manages a team of 12 AEs",
      "Strong relationship with Acme Corp and TechFlow Inc",
      "Pushing for faster feature delivery to close enterprise deals",
      "Concerned about v3 timeline impact on Q1 pipeline",
    ],
  },
  {
    id: "user_jason",
    name: "Jason Park",
    role: "Engineering Lead",
    department: "Engineering",
    avatar_url: "/avatars/jason.png",
    recent_interactions: [
      "Attended Q1 Pipeline Review with Sarah this morning",
      "Submitted v3 architecture RFC last week",
      "Running sprint planning for the platform team",
    ],
    relationship:
      "Technical counterpart, leads the eng team building the product",
    key_facts: [
      "Leading the v3 platform rewrite",
      "Team of 8 engineers, 2 positions open",
      "v3 target: March 15 deadline",
      "Concerned about scope creep from sales requests",
      "Proposed phased rollout to manage risk",
    ],
  },
];

// ============================================
// CLONES
// ============================================
export const mockClones: Clone[] = [
  {
    id: "clone_self",
    owner_id: "user_self",
    name: "Alex Morgan",
    avatar_url: "/avatars/alex.png",
    personality: {
      communication_style: "direct",
      tone: "Thoughtful and strategic, focuses on outcomes",
      bio: "VP of Product with a focus on enterprise growth. Bridges engineering and sales.",
      expertise_areas: [
        "product strategy",
        "roadmap planning",
        "enterprise features",
        "cross-functional alignment",
      ],
    },
    expertise_tags: ["product", "strategy", "roadmap", "enterprise"],
    status: "active",
    created_at: "2025-01-15T08:00:00Z",
    trained_at: "2025-01-15T10:00:00Z",
  },
  {
    id: "clone_sarah",
    owner_id: "user_sarah",
    name: "Sarah Chen",
    avatar_url: "/avatars/sarah.png",
    personality: {
      communication_style: "direct",
      tone: "Confident and data-driven, always ties back to revenue impact",
      bio: "VP of Sales driving enterprise revenue growth. Closes big deals and manages a top-performing team.",
      expertise_areas: [
        "sales strategy",
        "enterprise deals",
        "pipeline management",
        "client relationships",
      ],
    },
    expertise_tags: ["sales", "revenue", "deals", "pipeline", "enterprise"],
    status: "active",
    created_at: "2025-01-15T08:00:00Z",
    trained_at: "2025-01-16T09:00:00Z",
  },
  {
    id: "clone_jason",
    owner_id: "user_jason",
    name: "Jason Park",
    avatar_url: "/avatars/jason.png",
    personality: {
      communication_style: "detailed",
      tone: "Technical and methodical, provides thorough context",
      bio: "Engineering Lead building the next-gen platform. Advocates for quality and sustainable pace.",
      expertise_areas: [
        "platform architecture",
        "engineering management",
        "system design",
        "technical roadmap",
      ],
    },
    expertise_tags: [
      "engineering",
      "architecture",
      "platform",
      "technical",
      "v3",
    ],
    status: "active",
    created_at: "2025-01-15T08:00:00Z",
    trained_at: "2025-01-17T11:00:00Z",
  },
];

// ============================================
// MEETINGS
// ============================================
export const mockMeetings: Meeting[] = [
  {
    id: "meeting_1",
    title: "Q1 Pipeline Review",
    date: new Date().toISOString().split("T")[0] + "T09:00:00Z",
    attendees: [
      { name: "Sarah Chen", role: "VP of Sales" },
      { name: "Jason Park", role: "Engineering Lead" },
    ],
    summary:
      "Sarah and Jason reviewed the Q1 enterprise pipeline. Key tension around whether v3 features will be ready in time for the TechFlow Inc deal. They agreed on a phased approach but Sarah flagged risk to the $3.2M deal if SSO and audit logs slip past March.",
    discussion_points: [
      {
        topic: "Enterprise Pipeline Health",
        summary:
          "Pipeline is at $8.7M, up 23% from last quarter. Three deals over $1M: TechFlow ($3.2M), DataSync ($1.8M), CloudNine ($1.1M).",
        speaker: "Sarah Chen",
      },
      {
        topic: "v3 Feature Readiness",
        summary:
          "Jason confirmed core platform is on track for March 15. SSO and advanced audit logs are the two features most critical for enterprise deals. SSO is 80% done, audit logs are still in design.",
        speaker: "Jason Park",
      },
      {
        topic: "TechFlow Inc Deal Risk",
        summary:
          'Sarah flagged that TechFlow specifically requires SSO and audit logs for their security review. Without both by March, the deal could slip to Q2 or go to a competitor. Jason proposed delivering SSO by March 1 and a "preview" audit log by March 15.',
        speaker: "Sarah Chen",
      },
      {
        topic: "Phased Rollout Plan",
        summary:
          "Jason proposed a phased v3 rollout: Phase 1 (March 1) includes core platform + SSO. Phase 2 (March 15) adds audit logs + advanced permissions. Phase 3 (April 1) handles migration tooling. Sarah agreed this could work if TechFlow gets early access to Phase 1.",
        speaker: "Jason Park",
      },
      {
        topic: "Hiring Update",
        summary:
          "Jason mentioned two open positions on the platform team. If filled in the next 2 weeks, the March timeline is safe. If not, audit logs might slip by 1-2 weeks.",
        speaker: "Jason Park",
      },
    ],
    action_items: [
      {
        description:
          "Share Phase 1 timeline with TechFlow for their security review",
        assignee: "Sarah Chen",
        due_date: "Tomorrow",
        status: "pending",
      },
      {
        description:
          "Confirm SSO completion date and share technical spec with Sarah",
        assignee: "Jason Park",
        due_date: "End of week",
        status: "pending",
      },
      {
        description:
          "Draft audit log design doc and share with product for review",
        assignee: "Jason Park",
        due_date: "Next Monday",
        status: "pending",
      },
      {
        description: "Set up TechFlow early access program for Phase 1",
        assignee: "Sarah Chen",
        due_date: "Next week",
        status: "pending",
      },
      {
        description:
          "Review phased rollout plan and align with product roadmap",
        assignee: "Alex Morgan",
        due_date: "This week",
        status: "pending",
      },
    ],
    sentiment: "mixed",
  },
];

// ============================================
// DOCUMENTS
// ============================================
export const mockDocuments: MockDocument[] = [
  {
    id: "doc_1",
    clone_id: "clone_sarah",
    title: "Q1 Sales Playbook",
    content: `Enterprise Sales Playbook - Q1 Focus

Target: $10M ARR in Q1
Key Accounts: TechFlow Inc ($3.2M), DataSync Corp ($1.8M), CloudNine ($1.1M)

Strategy: Lead with platform reliability and security features (SSO, audit logs, SOC2).
TechFlow is our biggest opportunity — they need SSO and audit logging for compliance.
Decision maker: CTO Maria Santos. Champion: VP Eng David Kim.
Competition: Competitor X is also in the running but lacks enterprise features.

Timeline: TechFlow security review starts March 5. We need SSO ready by then.
DataSync is less urgent — Q1 close but flexible on timing.
CloudNine just started evaluation — early stage.

Risks: If v3 slips, TechFlow and DataSync both at risk. Need tight coordination with engineering.`,
    doc_type: "document",
    created_at: "2025-01-20T10:00:00Z",
  },
  {
    id: "doc_2",
    clone_id: "clone_jason",
    title: "v3 Platform Architecture RFC",
    content: `v3 Platform Architecture — RFC

Author: Jason Park
Status: In Review

Overview: Complete rewrite of the core platform to support enterprise-scale deployments.

Key Components:
1. Multi-tenant architecture with org-level isolation
2. SSO integration (SAML + OIDC) — 80% complete
3. Audit logging framework — in design phase
4. Role-based access control (RBAC) — complete
5. API rate limiting and usage tracking — complete

Timeline:
- Phase 1 (March 1): Core platform + SSO
- Phase 2 (March 15): Audit logs + advanced permissions
- Phase 3 (April 1): Migration tooling + documentation

Risks:
- Two open engineering positions. If not filled by Feb 28, Phase 2 may slip 1-2 weeks.
- Scope creep from sales feature requests. Need to hold the line on Phase 1 scope.
- Audit log design is complex — needs product review before implementation.

Team: 8 engineers currently, 2 positions open (senior backend, DevOps).`,
    doc_type: "document",
    created_at: "2025-01-18T14:00:00Z",
  },
  {
    id: "doc_3",
    clone_id: "clone_self",
    title: "Product Roadmap - Q1",
    content: `Product Roadmap — Q1

Priority 1: Enterprise Features (supports $8.7M pipeline)
- SSO (SAML + OIDC) — eng in progress
- Audit logging — eng in design
- Advanced RBAC — complete

Priority 2: Platform Reliability
- 99.95% uptime SLA
- Disaster recovery improvements
- Performance monitoring dashboard

Priority 3: Developer Experience
- Improved API documentation
- SDK updates
- Webhook management UI

Key Dependencies:
- Sales needs SSO for TechFlow deal (March deadline)
- Engineering needs 2 more hires to hit March 15 target
- Design team finishing audit log UX this week`,
    doc_type: "document",
    created_at: "2025-01-10T09:00:00Z",
  },
];

// ============================================
// SLACK MESSAGES
// ============================================
export interface SlackMessage {
  id: string;
  sender: string;
  content: string;
  channel: string;
  timestamp: string;
  mentions?: string[];
}

export const mockSlackMessages: SlackMessage[] = [
  {
    id: "slack_1",
    sender: "Sarah Chen",
    content:
      "Hey team, just wrapped the Q1 Pipeline Review with Jason. Good alignment on the phased approach for v3. Will share detailed notes shortly.",
    channel: "#leadership",
    timestamp: new Date().toISOString(),
    mentions: ["Jason Park"],
  },
  {
    id: "slack_2",
    sender: "Jason Park",
    content:
      "Good meeting with Sarah. I'll have the SSO completion timeline confirmed by EOW. Audit log design doc coming next Monday.",
    channel: "#engineering",
    timestamp: new Date().toISOString(),
  },
  {
    id: "slack_3",
    sender: "Sarah Chen",
    content:
      "@Alex heads up — TechFlow is asking about our security roadmap again. The SSO timeline from Jason will be key. Can we sync tomorrow?",
    channel: "#product-sales",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    mentions: ["Alex Morgan"],
  },
  {
    id: "slack_4",
    sender: "Jason Park",
    content:
      "Platform team standup: SSO SAML integration passing all tests. OIDC support needs another week. Two candidates in the pipeline for the open positions.",
    channel: "#engineering",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "slack_5",
    sender: "Sarah Chen",
    content:
      "Just got off a call with TechFlow's CTO. They're very interested but firm on needing SSO for their security review starting March 5. This is our biggest deal this quarter.",
    channel: "#sales",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    mentions: ["Alex Morgan"],
  },
  {
    id: "slack_6",
    sender: "Jason Park",
    content:
      "FYI @Alex — the audit log design is more complex than expected. We need to decide: do we build full immutable logging from day one, or start with a simpler event stream? Full version adds 2 weeks.",
    channel: "#product-eng",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    mentions: ["Alex Morgan"],
  },
  {
    id: "slack_7",
    sender: "Alex Morgan",
    content:
      "Let's go with the simpler event stream for Phase 2 and plan full immutable logging for Phase 3. TechFlow needs something they can show their security team, doesn't have to be the final version.",
    channel: "#product-eng",
    timestamp: new Date(Date.now() - 172000000).toISOString(),
  },
];

// ============================================
// MEMORIES
// ============================================
// Mock memories use a flat shape with `fact` for backward compat with clone-brain.ts
// The real Memory type uses `content`, `type`, `source` etc.
export interface MockMemory {
  id: string;
  clone_id: string;
  fact: string;
  confidence: number;
  created_at: string;
}

export const mockMemories: MockMemory[] = [
  {
    id: "mem_1",
    clone_id: "clone_sarah",
    fact: "TechFlow Inc is the largest deal in Q1 pipeline at $3.2M ARR. CTO Maria Santos is the decision maker, VP Eng David Kim is our champion.",
    confidence: 0.95,
    created_at: "2025-01-20T10:00:00Z",
  },
  {
    id: "mem_2",
    clone_id: "clone_sarah",
    fact: "TechFlow requires SSO and audit logging for their security review starting March 5. Without both features, the deal is at risk.",
    confidence: 0.95,
    created_at: "2025-01-25T14:00:00Z",
  },
  {
    id: "mem_3",
    clone_id: "clone_sarah",
    fact: "Q1 pipeline is at $8.7M, up 23% from last quarter. Acme Corp deal closed last week for $2.4M ARR.",
    confidence: 0.9,
    created_at: "2025-01-28T09:00:00Z",
  },
  {
    id: "mem_4",
    clone_id: "clone_jason",
    fact: "v3 platform rewrite on track for March 15 deadline. Phased rollout: Phase 1 (March 1) core + SSO, Phase 2 (March 15) audit logs, Phase 3 (April 1) migration.",
    confidence: 0.95,
    created_at: "2025-01-22T11:00:00Z",
  },
  {
    id: "mem_5",
    clone_id: "clone_jason",
    fact: "SSO (SAML) is 80% complete and passing tests. OIDC support needs another week. Two open positions on platform team — if not filled by Feb 28, Phase 2 may slip.",
    confidence: 0.9,
    created_at: "2025-01-27T15:00:00Z",
  },
  {
    id: "mem_6",
    clone_id: "clone_jason",
    fact: "Audit log design decision: going with simpler event stream for Phase 2, full immutable logging deferred to Phase 3. Alex approved this approach.",
    confidence: 0.95,
    created_at: "2025-01-28T10:00:00Z",
  },
  {
    id: "mem_7",
    clone_id: "clone_self",
    fact: "Enterprise features are Priority 1 for Q1. SSO and audit logs are the two most critical features for the $8.7M pipeline.",
    confidence: 0.95,
    created_at: "2025-01-10T09:00:00Z",
  },
  {
    id: "mem_8",
    clone_id: "clone_self",
    fact: "Approved simpler event stream approach for audit logs in Phase 2. Full immutable logging planned for Phase 3.",
    confidence: 0.9,
    created_at: "2025-01-28T11:00:00Z",
  },
];

// ============================================
// PROACTIVE REMINDERS
// ============================================
export const mockReminders: ProactiveReminder[] = [
  {
    id: "reminder_1",
    type: "meeting_debrief",
    title: "Debrief: Q1 Pipeline Review",
    description:
      "Sarah and Jason had their Q1 Pipeline Review this morning. Key decisions were made about the v3 rollout timeline and TechFlow deal. You should review the outcomes and action items.",
    meeting_id: "meeting_1",
    people: ["Sarah Chen", "Jason Park"],
    priority: "high",
    triggered: false,
  },
  {
    id: "reminder_2",
    type: "follow_up",
    title: "Follow up with Jason on audit log design",
    description:
      "Jason is sharing the audit log design doc next Monday. You should review it and provide product input before engineering starts implementation.",
    people: ["Jason Park"],
    priority: "medium",
    triggered: false,
  },
];

// ============================================
// HELPERS
// ============================================
export function getCloneById(id: string): Clone | undefined {
  return mockClones.find((c) => c.id === id);
}

export function getCloneByName(name: string): Clone | undefined {
  const nameLower = name.toLowerCase();
  return mockClones.find((c) => c.name.toLowerCase().includes(nameLower));
}

export function getPersonByUserId(userId: string): PersonContext | undefined {
  return mockPeople.find((p) => p.id === userId);
}

export function getMeetingById(id: string): Meeting | undefined {
  return mockMeetings.find((m) => m.id === id);
}

export function getActiveReminders(): ProactiveReminder[] {
  return mockReminders.filter((r) => !r.triggered);
}

export function getCloneForUser(userId: string): Clone | undefined {
  return mockClones.find((c) => c.owner_id === userId);
}
