import type {
  Employee,
  EmployeeResponse,
  Theme,
  AggregationResult,
  InsightsFilters,
  OnboardingBrief,
  MemoryItem,
  HandoffPack,
  Stance,
  CloneProfile,
  Citation,
} from "./types";

// ============================================
// EMPLOYEES
// ============================================

export const ALL_TEAMS = [
  "Engineering",
  "Product & Frontend",
  "ML Infrastructure",
];

export const employees: Employee[] = [
  { id: "e1", name: "James Liu", role: "ML & Backend Lead", team: "Engineering", tenure: "", initials: "JL" },
  { id: "e2", name: "Ella Lan", role: "Full-Stack Engineer", team: "Engineering", tenure: "", initials: "EL" },
  { id: "e3", name: "Angelina Quan", role: "Product & Frontend", team: "Product & Frontend", tenure: "", initials: "AQ" },
  { id: "e4", name: "Videet Mehta", role: "ML Infrastructure", team: "ML Infrastructure", tenure: "", initials: "VM" },
];

// ============================================
// BASE EMPLOYEE RESPONSES (default scenario)
// ============================================

const baseResponses: Omit<EmployeeResponse, "employee">[] = [
  {
    stance: "oppose",
    confidence: 0.88,
    summary: "Strong opposition. Built the core analytics engine and sees significant technical risk in discontinuation.",
    reasoning: "Marcus has invested 3+ years building the analytics engine. He's concerned about the migration complexity for existing customers and believes the product still has untapped potential. He also worries about his team's future within the company.",
    citations: [
      { source: "Slack #engineering", snippet: "The analytics query optimizer handles 2M+ queries/day. We can't just sunset that without a migration path.", date: "Jan 28, 2026" },
      { source: "Architecture Review", snippet: "Analytics pipeline has deep integrations with 40+ customer data warehouses.", date: "Jan 15, 2026" },
    ],
  },
  {
    stance: "neutral",
    confidence: 0.72,
    summary: "Mixed feelings. Sees technical debt in the current system but worried about team displacement.",
    reasoning: "Priya acknowledges the analytics product has significant technical debt and maintenance burden. However, she's concerned about what happens to the team that currently maintains it. She'd be supportive if there's a clear transition plan.",
    citations: [
      { source: "Sprint Retro Notes", snippet: "We spend ~30% of each sprint on analytics maintenance. That's not sustainable.", date: "Feb 7, 2026" },
      { source: "Slack #eng-general", snippet: "What happens to the analytics team if the product is sunset?", date: "Feb 3, 2026" },
    ],
  },
  {
    stance: "support",
    confidence: 0.82,
    summary: "Supportive. Sees this as an opportunity to consolidate the platform and reduce technical debt.",
    reasoning: "David has long advocated for platform consolidation. He views the analytics product as a distraction from the company's AI-first strategy. He believes the engineering resources would be better spent on the new platform.",
    citations: [
      { source: "Architecture RFC", snippet: "Maintaining two separate data layers is the #1 source of platform incidents.", date: "Jan 18, 2026" },
      { source: "Eng All-Hands", snippet: "We should invest in one world-class product, not two mediocre ones.", date: "Jan 5, 2026" },
    ],
  },
  {
    stance: "oppose",
    confidence: 0.91,
    summary: "Strongly opposes. Multiple active deals depend on the analytics product.",
    reasoning: "Rachel has 4 enterprise accounts that specifically purchased or are evaluating Meridian Analytics. Discontinuation would jeopardize approximately $2.8M in pipeline and damage trust with existing customers.",
    citations: [
      { source: "CRM Pipeline Report", snippet: "TechFlow ($1.2M), DataSync ($800K), CloudNine ($500K), Vertex ($300K) — all analytics-dependent.", date: "Feb 10, 2026" },
      { source: "Customer Call Notes", snippet: "TechFlow's CTO: 'We chose Meridian specifically for the analytics capabilities.'", date: "Jan 22, 2026" },
    ],
  },
  {
    stance: "oppose",
    confidence: 0.85,
    summary: "Opposes due to revenue impact but acknowledges long-term strategic logic.",
    reasoning: "James recognizes the company can't support two product lines indefinitely but believes the timing is wrong. Analytics represents 35% of current ARR. He advocates for a 12–18 month sunset with active customer migration support.",
    citations: [
      { source: "Revenue Report Q4", snippet: "Analytics ARR: $4.2M (35% of total). YoY growth: -8%.", date: "Jan 3, 2026" },
      { source: "Sales Team Sync", snippet: "We need at least 12 months to migrate enterprise customers without churn.", date: "Feb 5, 2026" },
    ],
  },
  {
    stance: "neutral",
    confidence: 0.65,
    summary: "Relatively neutral. Newer to the company and sees both sides.",
    reasoning: "Nina joined after the company's pivot to AI. She notes that most inbound interest is for the AI platform, not analytics. However, she acknowledges the analytics customers are valuable and need a migration path.",
    citations: [
      { source: "Inbound Lead Analysis", snippet: "78% of Q1 inbound leads mention AI capabilities, only 12% mention analytics.", date: "Feb 8, 2026" },
      { source: "SDR Team Meeting", snippet: "We rarely pitch analytics anymore — the AI platform sells itself.", date: "Jan 30, 2026" },
    ],
  },
  {
    stance: "oppose",
    confidence: 0.88,
    summary: "Opposes without a clear migration plan. Concerned about customer churn.",
    reasoning: "Sofia manages relationships with analytics customers and fears discontinuation without a robust migration plan would cause significant churn. She estimates 30–40% of analytics customers have no interest in the AI platform.",
    citations: [
      { source: "Customer Health Dashboard", snippet: "42 accounts actively using analytics features. 15 have no AI platform engagement.", date: "Feb 1, 2026" },
      { source: "NPS Survey", snippet: "Analytics-only customers: NPS 62. Mixed-use customers: NPS 74.", date: "Jan 15, 2026" },
    ],
  },
  {
    stance: "neutral",
    confidence: 0.74,
    summary: "Cautiously neutral. Supports the move with proper customer migration support.",
    reasoning: "Tom has seen increasing support tickets for analytics and believes the product is becoming harder to maintain. He'd support discontinuation if accompanied by a dedicated migration team and generous transition timeline.",
    citations: [
      { source: "Support Ticket Trends", snippet: "Analytics tickets up 45% QoQ. Average resolution time: 4.2 hours (vs 1.8 for AI platform).", date: "Feb 6, 2026" },
      { source: "CS Team Retro", snippet: "We need a migration playbook before we can support any sunset.", date: "Jan 28, 2026" },
    ],
  },
  {
    stance: "support",
    confidence: 0.86,
    summary: "Supports. Resources currently split across two products are hurting both.",
    reasoning: "Emma has been frustrated by the resource contention between analytics and the AI platform. She believes consolidating would let the team build a better, more focused product and advocates for integrating key analytics features into the AI platform.",
    citations: [
      { source: "Product Roadmap Review", snippet: "We deferred 3 AI platform features in Q4 due to analytics maintenance demands.", date: "Dec 20, 2025" },
      { source: "Feature Request Board", snippet: "Top 8 customer requests are all AI-platform related. Analytics requests are declining.", date: "Feb 2, 2026" },
    ],
  },
  {
    stance: "support",
    confidence: 0.90,
    summary: "Strongly supports. Sees this as essential for the company's strategic direction.",
    reasoning: "Alex has been pushing for this decision for months. He believes the market has shifted to AI-first analytics and maintaining the legacy product is a strategic liability. He has a detailed consolidation roadmap ready.",
    citations: [
      { source: "Strategy Memo", snippet: "The analytics market is consolidating around AI-native platforms. Our legacy product can't compete.", date: "Jan 10, 2026" },
      { source: "Board Prep Doc", snippet: "Recommendation: sunset Analytics within 12 months, migrate to AI platform analytics module.", date: "Feb 10, 2026" },
    ],
  },
  {
    stance: "support",
    confidence: 0.78,
    summary: "Supports. The dual-product design system is unsustainable.",
    reasoning: "Kai finds maintaining design consistency across two products challenging. Consolidating would allow the design team to focus on one excellent experience rather than two mediocre ones.",
    citations: [
      { source: "Design System Audit", snippet: "487 unique components across both products. Only 31% are shared.", date: "Jan 20, 2026" },
      { source: "Design Team Standup", snippet: "Every analytics update requires double the QA for design consistency.", date: "Feb 4, 2026" },
    ],
  },
  {
    stance: "neutral",
    confidence: 0.70,
    summary: "Neutral with concerns about market messaging. This requires careful positioning.",
    reasoning: "Lisa sees the strategic logic but worries about the narrative. Discontinuing a product could signal instability to the market. She recommends framing it as 'evolution' rather than 'discontinuation' and needs 2–3 months to prepare messaging.",
    citations: [
      { source: "Brand Perception Study", snippet: "72% of prospects associate Meridian with 'reliable enterprise analytics.'", date: "Dec 15, 2025" },
      { source: "Marketing Sync", snippet: "We need a migration narrative: 'Analytics is evolving into AI-powered insights.'", date: "Feb 7, 2026" },
    ],
  },
  {
    stance: "support",
    confidence: 0.80,
    summary: "Supports. Running two product infrastructures is operationally expensive.",
    reasoning: "Ryan has been managing infrastructure for both products and the operational overhead is significant. Consolidating would reduce costs by an estimated 25% and simplify the ops team's workload.",
    citations: [
      { source: "Infrastructure Cost Report", snippet: "Analytics infra: $47K/month. AI platform: $62K/month. Shared services: $23K/month.", date: "Jan 31, 2026" },
      { source: "Incident Log", snippet: "3 of the last 5 P1 incidents originated in analytics-specific infrastructure.", date: "Feb 9, 2026" },
    ],
  },
];

// ============================================
// THEMES
// ============================================

function buildThemes(responses: EmployeeResponse[]): Theme[] {
  const themes: Theme[] = [
    {
      id: "t1",
      label: "Revenue & Customer Impact",
      count: 0,
      dominantStance: "oppose",
      description: "Concerns about losing revenue from analytics-dependent customers and jeopardizing active deals in the pipeline.",
      employeeIds: ["e4", "e5", "e7", "e8"],
    },
    {
      id: "t2",
      label: "Technical Debt Relief",
      count: 0,
      dominantStance: "support",
      description: "Opportunity to eliminate dual-stack maintenance, consolidate infrastructure, and reduce incident frequency.",
      employeeIds: ["e3", "e2", "e11", "e13"],
    },
    {
      id: "t3",
      label: "Strategic Focus & Resources",
      count: 0,
      dominantStance: "support",
      description: "Consolidating to one product allows the team to compete more effectively in the AI-first analytics market.",
      employeeIds: ["e3", "e9", "e10", "e13"],
    },
    {
      id: "t4",
      label: "Team & Job Concerns",
      count: 0,
      dominantStance: "neutral",
      description: "Uncertainty about the future of the analytics team and whether roles will transition or be eliminated.",
      employeeIds: ["e1", "e2", "e6"],
    },
    {
      id: "t5",
      label: "Migration Complexity",
      count: 0,
      dominantStance: "oppose",
      description: "Technical and operational challenges of migrating 40+ customer integrations from the legacy analytics platform.",
      employeeIds: ["e1", "e7", "e8", "e12"],
    },
  ];

  const activeIds = new Set(responses.map((r) => r.employee.id));
  return themes
    .map((t) => {
      const activeEmployees = t.employeeIds.filter((id) => activeIds.has(id));
      return { ...t, count: activeEmployees.length, employeeIds: activeEmployees };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

// ============================================
// QUERY RESPONSES
// ============================================

export function getResponsesForQuery(
  _query: string,
  filters: InsightsFilters
): EmployeeResponse[] {
  let filtered = employees;

  if (filters.teams.length > 0) {
    filtered = filtered.filter((e) => filters.teams.includes(e.team));
  }

  return filtered.map((emp, idx) => {
    const base = baseResponses[idx];
    return {
      employee: emp,
      stance: base.stance,
      confidence: base.confidence,
      summary: base.summary,
      reasoning: base.reasoning,
      citations: base.citations,
    };
  });
}

export function computeAggregation(
  responses: EmployeeResponse[],
  filters: InsightsFilters
): AggregationResult {
  const total = responses.length;
  const support = responses.filter((r) => r.stance === "support").length;
  const neutral = responses.filter((r) => r.stance === "neutral").length;
  const oppose = responses.filter((r) => r.stance === "oppose").length;
  const avgConfidence =
    responses.reduce((sum, r) => sum + r.confidence, 0) / total;
  const themes = buildThemes(responses);

  const topStance = support >= oppose ? "supportive" : "opposed";

  return {
    distribution: {
      support: Math.round((support / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      oppose: Math.round((oppose / total) * 100),
    },
    overallConfidence: Math.round(avgConfidence * 100) / 100,
    themes,
    totalResponses: total,
    summary: `Across ${total} employees, the organization is predominantly ${topStance} (${Math.round(
      (support / total) * 100
    )}% support, ${Math.round((oppose / total) * 100)}% oppose). ${themes[0]?.label || "Mixed sentiment"} emerged as the dominant theme.`,
  };
}

// ============================================
// ONBOARDING BRIEFS
// ============================================

export const onboardingOptions = [
  { role: "Senior Product Manager", team: "AI Platform" },
  { role: "Software Engineer", team: "Engineering" },
  { role: "Account Executive", team: "Sales" },
];

export const onboardingBriefs: Record<string, OnboardingBrief> = {
  "Senior Product Manager-AI Platform": {
    role: "Senior Product Manager",
    team: "AI Platform",
    generatedAt: new Date().toISOString(),
    keyContext: [
      "Meridian is a B2B SaaS company pivoting from legacy analytics to an AI-first platform. The AI Platform launched 8 months ago and is growing 40% QoQ.",
      "The legacy Analytics product ($4.2M ARR, 35% of revenue) is under strategic review for possible sunset — this is politically sensitive.",
      "Current sprint priorities: enterprise features (SSO, audit logs, RBAC) to support $8.7M pipeline.",
      "Team is 45 people across product + engineering. Two open engineering roles are critical to the March delivery timeline.",
      "The company culture values direct communication and data-backed decisions. Weekly product syncs happen Tuesdays at 10am.",
    ],
    keyPeople: [
      { name: "Alex Novak", role: "Product Lead", relationship: "Your direct manager. Owns product strategy and reports to CEO.", tip: "Prefers written proposals before meetings. Send a 1-pager before pitching ideas." },
      { name: "David Kim", role: "Staff Engineer", relationship: "Platform architect, key technical partner for any feature work.", tip: "Very detail-oriented. Come prepared with technical constraints understood." },
      { name: "Kai Tanaka", role: "Lead Designer", relationship: "Design partner. Works closely with PM on all user-facing features.", tip: "Book 30-min design syncs early — his calendar fills up fast." },
      { name: "Rachel Torres", role: "Account Executive", relationship: "Primary sales contact for enterprise deals. Voice of the customer.", tip: "She'll push for customer requests aggressively — that's her job. Stay firm on roadmap." },
      { name: "Sofia Martinez", role: "CS Lead", relationship: "Manages customer relationships. Key source for churn risk data.", tip: "Great ally for customer insight. Set up a bi-weekly sync." },
    ],
    keyDocs: [
      { title: "AI Platform PRD v2.3", type: "Product", url: "/docs/platform-prd", relevance: "Core product requirements and success metrics." },
      { title: "Platform Architecture RFC", type: "Engineering", url: "/docs/arch-rfc", relevance: "Technical architecture and phase rollout plan." },
      { title: "Q1 Product Roadmap", type: "Product", url: "/docs/roadmap-q1", relevance: "Current quarter priorities and dependencies." },
      { title: "Customer Feedback Synthesis Q4", type: "Customer Success", url: "/docs/feedback-q4", relevance: "Aggregated customer pain points and feature requests." },
      { title: "Competitive Analysis 2026", type: "Marketing", url: "/docs/competitive", relevance: "Market positioning and competitor feature comparison." },
    ],
    decisions: [
      { decision: "Prioritize SSO over custom auth for enterprise readiness", date: "Jan 15, 2026", rationale: "SSO is a hard requirement for 3 enterprise deals totaling $5.2M. Custom auth can wait.", participants: ["Alex Novak", "David Kim", "Rachel Torres"] },
      { decision: "Use event stream (not full immutable logging) for Phase 2 audit logs", date: "Jan 8, 2026", rationale: "Full immutable logging adds 2 weeks. Event stream meets TechFlow's security review requirements.", participants: ["Alex Novak", "David Kim"] },
      { decision: "Phased v3 rollout: Core+SSO (Mar 1) → Audit (Mar 15) → Migration (Apr 1)", date: "Dec 20, 2025", rationale: "Reduces delivery risk. Allows early access for key accounts.", participants: ["Alex Novak", "David Kim", "James Liu"] },
      { decision: "Adopt unified design system across all products", date: "Dec 5, 2025", rationale: "Design team can't sustain two separate systems. 487 components with only 31% shared.", participants: ["Kai Tanaka", "Alex Novak"] },
    ],
    risks: [
      { risk: "Analytics product sunset decision pending — may significantly affect roadmap and team structure", severity: "high", context: "The board is reviewing whether to sunset the legacy Analytics product. If approved, PM scope expands to include analytics-to-AI migration." },
      { risk: "Two open engineering positions may delay March delivery", severity: "medium", context: "If not filled by Feb 28, Phase 2 (audit logs) may slip 1–2 weeks. David Kim is the hiring manager." },
      { risk: "TechFlow deal ($3.2M) hard-depends on March SSO deadline", severity: "medium", context: "TechFlow's security review starts March 5. If SSO isn't ready, the deal slips to Q2 or we lose to Competitor X." },
      { risk: "Design system migration creates temporary UX inconsistencies", severity: "low", context: "Some pages will use the old component library until migration is complete (~6 weeks)." },
    ],
  },
  "Software Engineer-Engineering": {
    role: "Software Engineer",
    team: "Engineering",
    generatedAt: new Date().toISOString(),
    keyContext: [
      "You're joining the platform engineering team during a critical v3 rewrite phase.",
      "The team runs 2-week sprints with planning on Mondays. Daily standups at 9:30am.",
      "Tech stack: TypeScript, React, Node.js, PostgreSQL, Redis, AWS.",
      "Current focus: SSO integration (SAML + OIDC) and audit logging framework.",
      "Code review culture is strong — every PR needs at least 2 approvals.",
    ],
    keyPeople: [
      { name: "David Kim", role: "Staff Engineer", relationship: "Technical lead and your go-to for architecture questions.", tip: "He loves thorough PR descriptions. Include context and testing notes." },
      { name: "Marcus Chen", role: "Senior Engineer", relationship: "Analytics engine owner. Deep domain knowledge.", tip: "Great for understanding legacy systems. Pair with him in week 1." },
      { name: "Priya Sharma", role: "Software Engineer", relationship: "Peer on the platform team. Good onboarding buddy.", tip: "She's gone through onboarding recently — ask her about setup gotchas." },
      { name: "Emma Walsh", role: "Product Manager", relationship: "PM for the AI platform. Defines requirements.", tip: "She's very responsive on Slack. Ping her for quick clarifications." },
      { name: "Jason Park", role: "Engineering Manager", relationship: "Your manager. Handles 1:1s and career development.", tip: "He values initiative. Flag blockers early, propose solutions." },
    ],
    keyDocs: [
      { title: "Engineering Onboarding Guide", type: "Engineering", url: "/docs/eng-onboarding", relevance: "Dev environment setup, coding standards, PR process." },
      { title: "Platform Architecture RFC", type: "Engineering", url: "/docs/arch-rfc", relevance: "System architecture and design decisions." },
      { title: "API Reference", type: "Engineering", url: "/docs/api-ref", relevance: "All public and internal API endpoints." },
      { title: "On-Call Runbook", type: "Operations", url: "/docs/runbook", relevance: "Incident response procedures (you'll be added to rotation in month 2)." },
      { title: "Testing Guidelines", type: "Engineering", url: "/docs/testing", relevance: "Unit, integration, and E2E testing standards." },
    ],
    decisions: [
      { decision: "Migrate from REST to GraphQL for new API endpoints", date: "Jan 20, 2026", rationale: "Reduces over-fetching on mobile clients. Existing REST endpoints maintained for backwards compatibility.", participants: ["David Kim", "Marcus Chen"] },
      { decision: "Adopt Vitest over Jest for new test suites", date: "Jan 12, 2026", rationale: "Better TypeScript support and faster execution. Existing Jest tests will be migrated gradually.", participants: ["David Kim", "Priya Sharma"] },
      { decision: "Use event stream for Phase 2 audit logs", date: "Jan 8, 2026", rationale: "Simpler implementation that meets current requirements. Full immutable logging deferred to Phase 3.", participants: ["Alex Novak", "David Kim"] },
    ],
    risks: [
      { risk: "v3 March 15 deadline is tight — scope management is critical", severity: "high", context: "Any scope additions need explicit approval from David Kim and Emma Walsh." },
      { risk: "Analytics pipeline has intermittent memory leak", severity: "medium", context: "Marcus is investigating. May affect you if assigned to analytics-adjacent work." },
      { risk: "Two open positions mean heavier workload until backfilled", severity: "medium", context: "Team is at 6/8 capacity. Expect some overtime during sprint crunch." },
    ],
  },
  "Account Executive-Sales": {
    role: "Account Executive",
    team: "Sales",
    generatedAt: new Date().toISOString(),
    keyContext: [
      "Meridian sells B2B SaaS with two products: legacy Analytics ($4.2M ARR) and AI Platform (growing 40% QoQ).",
      "The sales team has 12 AEs + 4 SDRs. Monthly quota is $150K ARR per AE.",
      "Enterprise deals ($500K+) require security review and typically have 60–90 day cycles.",
      "The AI Platform is the growth engine — most new pipeline comes from AI capabilities.",
      "CRM: Salesforce. Sales engagement: Outreach. Comms: Slack.",
    ],
    keyPeople: [
      { name: "James Liu", role: "Sales Director", relationship: "Your manager. Runs weekly pipeline reviews.", tip: "He values data. Always update your Salesforce notes before pipeline reviews." },
      { name: "Rachel Torres", role: "Account Executive", relationship: "Top performer, great mentor for learning the sales motion.", tip: "Shadow her calls in week 1 — she has the best discovery framework." },
      { name: "Nina Patel", role: "SDR Lead", relationship: "Manages the SDR team that feeds your pipeline.", tip: "Meet with her to align on your ICP and qualification criteria." },
      { name: "Emma Walsh", role: "Product Manager", relationship: "Go-to for product questions and demo support.", tip: "She can join enterprise demos. Book her 1 week in advance." },
      { name: "Sofia Martinez", role: "CS Lead", relationship: "Manages post-sale relationships. Key for renewals and expansion.", tip: "Introduce her to champions early — smooth handoff matters." },
    ],
    keyDocs: [
      { title: "Sales Playbook 2026", type: "Sales", url: "/docs/sales-playbook", relevance: "Positioning, objection handling, competitive intel." },
      { title: "Enterprise Deal Process", type: "Sales", url: "/docs/deal-process", relevance: "Stage gates, approval workflows, security review process." },
      { title: "Product Demo Script", type: "Sales", url: "/docs/demo-script", relevance: "Structured demo flow for AI Platform." },
      { title: "Competitive Battle Cards", type: "Marketing", url: "/docs/battle-cards", relevance: "Head-to-head comparison with top 3 competitors." },
      { title: "Pricing & Packaging Guide", type: "Sales", url: "/docs/pricing", relevance: "Pricing tiers, discount authority, custom deal structures." },
    ],
    decisions: [
      { decision: "Lead with AI Platform for all new business", date: "Jan 5, 2026", rationale: "AI Platform has 3x higher win rate vs analytics-led deals. Analytics available as add-on.", participants: ["James Liu", "Alex Novak"] },
      { decision: "Require VP approval for discounts >20%", date: "Dec 15, 2025", rationale: "Protect margins. Average discount had crept to 28%.", participants: ["James Liu"] },
      { decision: "Implement champion-first selling methodology", date: "Nov 20, 2025", rationale: "Deals with identified champions close 2.4x faster.", participants: ["James Liu", "Rachel Torres"] },
    ],
    risks: [
      { risk: "Analytics sunset may disrupt existing customer conversations", severity: "high", context: "If announced, AEs need to proactively address migration with current analytics customers." },
      { risk: "Competitor X just raised $50M and is expanding enterprise sales", severity: "medium", context: "They're offering aggressive pricing. Our differentiation is AI capabilities + platform reliability." },
      { risk: "SSO deadline could affect Q1 enterprise deals", severity: "medium", context: "TechFlow and DataSync both require SSO. Engineering target: March 1." },
    ],
  },
};

// ============================================
// MEMORY ITEMS
// ============================================

export const memoryItems: MemoryItem[] = [
  {
    id: "m1",
    type: "episodic",
    title: "Q4 Product Strategy Offsite",
    content: "Two-day offsite at Meridian HQ. Key outcomes:\n\n1. Agreed to pursue AI-first strategy for 2026\n2. Analytics product marked for 'strategic review' (euphemism for potential sunset)\n3. Alex Novak presented consolidation roadmap — received mixed reactions from sales\n4. David Kim flagged engineering capacity concerns for dual-product support\n5. James Liu argued for 12-month minimum transition period if sunset proceeds\n\nAction items: Alex to prepare board recommendation by Feb 15. James to model revenue impact scenarios.",
    timestamp: "2025-12-12T09:00:00Z",
    tags: ["strategy", "product", "offsite"],
    team: "Leadership",
    citations: [
      { source: "Offsite Notes", snippet: "Alex: 'We can't be world-class at two things. Let's be the best AI analytics platform.'", date: "Dec 12, 2025" },
      { source: "Offsite Notes", snippet: "James: 'We need 12 months minimum. Our enterprise customers have annual contracts.'", date: "Dec 12, 2025" },
    ],
  },
  {
    id: "m2",
    type: "episodic",
    title: "Analytics Pipeline Outage — Post-Mortem",
    content: "Severity: P1 | Duration: 3h 42m | Impact: 12 enterprise customers\n\nRoot cause: Connection pool exhaustion in the analytics query optimizer during peak load. The legacy connection pooling library doesn't handle concurrent spikes well.\n\nTimeline:\n- 14:03 — Alerts fire for elevated error rates\n- 14:15 — Marcus Chen identifies connection pool issue\n- 14:45 — Temporary fix deployed (increased pool size)\n- 17:45 — Full resolution after config rollout\n\nAction items: Marcus to implement proper connection pooling with PgBouncer. David Kim to review analytics infrastructure for similar single-point failures.",
    timestamp: "2026-01-18T14:00:00Z",
    tags: ["incident", "analytics", "engineering"],
    team: "Engineering",
    citations: [
      { source: "PagerDuty Alert", snippet: "Analytics API error rate >5% for 10 minutes. 847 failed requests.", date: "Jan 18, 2026" },
      { source: "Post-Mortem Doc", snippet: "Root cause: legacy connection pool library lacks backpressure handling.", date: "Jan 20, 2026" },
    ],
  },
  {
    id: "m3",
    type: "semantic",
    title: "Analytics Product Architecture Overview",
    content: "The Meridian Analytics product is a monolithic application with the following key components:\n\n**Data Layer**: PostgreSQL (primary), Redis (caching), S3 (data lake)\n**Query Engine**: Custom query optimizer built by Marcus Chen. Handles ~2M queries/day.\n**Dashboard Service**: React frontend, serves 42 enterprise customers\n**Integration Layer**: 40+ customer data warehouse connectors (Snowflake, BigQuery, Redshift, Databricks)\n**API**: REST API v2, 147 endpoints\n\nKnown technical debt:\n- Connection pooling is fragile under load\n- No horizontal scaling — single node architecture\n- Dashboard component library is outdated (React 17)\n- Test coverage: 43% (below team target of 80%)",
    timestamp: "2026-01-15T10:00:00Z",
    tags: ["architecture", "analytics", "engineering"],
    team: "Engineering",
    citations: [
      { source: "Architecture RFC", snippet: "Analytics runs on a single node handling 2M+ daily queries.", date: "Jan 15, 2026" },
    ],
  },
  {
    id: "m4",
    type: "episodic",
    title: "Decision: Sunset Legacy Dashboard v1",
    content: "In the November product review, the team decided to sunset Dashboard v1 in favor of the redesigned v2.\n\nRationale: v1 uses an outdated component library and doesn't support the new design system. Maintaining both versions is costing ~15 engineering hours per sprint.\n\nTimeline: v1 sunset scheduled for March 31, 2026. Migration guide published. 8 of 42 enterprise customers still on v1.\n\nRisk: 3 customers have expressed resistance to migrating. Sofia Martinez is managing those conversations.",
    timestamp: "2025-11-30T15:00:00Z",
    tags: ["decision", "product", "design"],
    team: "Product",
    citations: [
      { source: "Product Review Notes", snippet: "Dashboard v1 maintenance is 15 hrs/sprint. That's a full engineer.", date: "Nov 30, 2025" },
    ],
  },
  {
    id: "m5",
    type: "semantic",
    title: "Enterprise Sales Process & Deal Stages",
    content: "Meridian enterprise deal process:\n\n**Stage 1 — Discovery** (1-2 weeks): Identify pain, map stakeholders, qualify budget\n**Stage 2 — Technical Eval** (2-3 weeks): Demo, POC setup, security questionnaire\n**Stage 3 — Security Review** (2-4 weeks): SSO requirements, audit log review, SOC2 compliance\n**Stage 4 — Procurement** (2-3 weeks): Contract negotiation, legal review\n**Stage 5 — Closed Won**: Implementation kickoff with CS team\n\nAverage enterprise cycle: 60-90 days\nAverage deal size: $280K ARR\nWin rate (AI Platform): 34%\nWin rate (Analytics): 12%\n\nKey insight: Deals with identified champions close 2.4x faster.",
    timestamp: "2026-01-05T09:00:00Z",
    tags: ["sales", "process", "enterprise"],
    team: "Sales",
    citations: [
      { source: "Sales Ops Dashboard", snippet: "AI Platform win rate: 34%. Analytics win rate: 12%.", date: "Jan 5, 2026" },
    ],
  },
  {
    id: "m6",
    type: "episodic",
    title: "Engineering All-Hands: 2026 Platform Roadmap",
    content: "David Kim presented the 2026 platform roadmap to the full engineering team.\n\nKey announcements:\n1. v3 platform rewrite is the #1 priority\n2. Phased rollout: SSO (Mar 1) → Audit Logs (Mar 15) → Migration (Apr 1)\n3. Two new senior positions approved (backend + DevOps)\n4. New design system adoption starting Q1\n5. Target: 80% test coverage for all new code\n\nTeam sentiment was generally positive but concerns raised about:\n- Aggressive March timeline\n- Impact on analytics maintenance during the rewrite\n- On-call burden with two products",
    timestamp: "2026-01-05T14:00:00Z",
    tags: ["roadmap", "engineering", "all-hands"],
    team: "Engineering",
    citations: [
      { source: "All-Hands Recording", snippet: "David: 'v3 is not just a rewrite — it's our ticket to the enterprise market.'", date: "Jan 5, 2026" },
    ],
  },
  {
    id: "m7",
    type: "semantic",
    title: "On-Call Runbook: Analytics Service",
    content: "**Analytics Service On-Call Guide**\n\nEscalation chain: On-call engineer → Marcus Chen → David Kim → VP Eng\n\nCommon issues:\n1. **High error rate**: Check connection pool status. If exhausted, restart the query optimizer service.\n2. **Slow queries**: Check for long-running queries in pg_stat_activity. Kill queries >30s.\n3. **Data sync failures**: Check connector health dashboard. Most issues resolve with a retry.\n4. **Memory spikes**: Known issue with the query optimizer. Restart service if RSS >4GB.\n\nCritical: The analytics query optimizer has no auto-recovery. If it crashes, manual restart is required. Marcus has a fix in progress.",
    timestamp: "2026-01-10T11:00:00Z",
    tags: ["runbook", "operations", "analytics"],
    team: "Operations",
    citations: [
      { source: "Incident History", snippet: "5 manual restarts of query optimizer in last 30 days.", date: "Jan 10, 2026" },
    ],
  },
  {
    id: "m8",
    type: "episodic",
    title: "Customer Advisory Board — Q4 Feedback Session",
    content: "Quarterly CAB meeting with 8 enterprise customers. Key takeaways:\n\n**Top requests:**\n1. SSO / SAML integration (mentioned by 6/8 customers)\n2. Advanced audit logging for compliance (4/8)\n3. Better API rate limiting transparency (3/8)\n4. AI-powered anomaly detection in analytics (5/8)\n\n**Sentiment:**\n- Very positive on AI platform direction\n- Mixed on analytics — some want more investment, others see AI replacing it\n- Strong demand for enterprise security features\n\n**Notable quote:** TechFlow CTO: 'We chose Meridian for analytics, but we're staying for AI.'",
    timestamp: "2026-01-22T10:00:00Z",
    tags: ["customer", "feedback", "product"],
    team: "Product",
    citations: [
      { source: "CAB Recording", snippet: "6 of 8 customers listed SSO as their #1 feature request.", date: "Jan 22, 2026" },
      { source: "CAB Notes", snippet: "TechFlow CTO: 'We chose Meridian for analytics, but we're staying for AI.'", date: "Jan 22, 2026" },
    ],
  },
  {
    id: "m9",
    type: "semantic",
    title: "Team Structure & Responsibilities",
    content: "**Meridian Team Structure (120 employees)**\n\n- **Engineering** (32): Platform team (8), Analytics team (6), AI team (10), Infrastructure (4), QA (4)\n- **Product** (6): AI Platform PM, Analytics PM, Product Lead, 2 Product Analysts, UX Researcher\n- **Design** (5): Lead Designer, 2 Product Designers, 1 Brand Designer, 1 UX Writer\n- **Sales** (16): Director, 12 AEs, 3 SDRs\n- **Customer Success** (12): CS Lead, 8 CSMs, 3 Support Engineers\n- **Marketing** (8): Director, Content, Demand Gen, Product Marketing, Events, 3 others\n- **Operations** (6): Ops Manager, 2 IT, Finance, HR, Office\n- **Leadership** (5): CEO, CTO, VP Sales, VP Product, VP Eng\n- **Other** (30): Various roles",
    timestamp: "2026-02-01T09:00:00Z",
    tags: ["org", "teams", "people"],
    team: "Leadership",
    citations: [],
  },
  {
    id: "m10",
    type: "episodic",
    title: "Sprint Retrospective: AI Features Launch",
    content: "Sprint 2026-03 retro for the AI Platform team.\n\n**What went well:**\n- Shipped AI anomaly detection on time\n- Zero P1 incidents during launch\n- Customer response overwhelmingly positive (NPS +12 in first week)\n\n**What could improve:**\n- Documentation lagged behind feature development\n- QA bottleneck in final days of sprint\n- Design handoffs happened too late\n\n**Action items:**\n- Emma to require docs as part of 'Definition of Done'\n- David to implement parallel QA track\n- Kai to deliver designs 3 days before sprint starts",
    timestamp: "2026-02-07T16:00:00Z",
    tags: ["retro", "engineering", "ai-platform"],
    team: "Engineering",
    citations: [
      { source: "Sprint Metrics", snippet: "AI anomaly detection: 0 P1s, NPS +12, 94% positive feedback.", date: "Feb 7, 2026" },
    ],
  },
  {
    id: "m11",
    type: "semantic",
    title: "Data Pipeline Architecture & Dependencies",
    content: "**Meridian Data Pipeline Map**\n\nIngestion → Processing → Storage → Serving\n\n**Ingestion**: Customer data flows in via 40+ connectors (Snowflake, BigQuery, Redshift, Databricks, custom APIs)\n**Processing**: Apache Kafka for event streaming, custom ETL jobs for batch processing\n**Storage**: PostgreSQL (transactional), S3 (data lake), Redis (caching)\n**Serving**: Analytics API (REST) + AI Platform API (GraphQL)\n\n**Critical dependency**: Both products share the Kafka cluster and PostgreSQL instance. This is the main coupling point.\n\n**Risk**: If analytics is sunset, the shared Kafka topics and Postgres schemas need careful migration planning.",
    timestamp: "2026-01-25T14:00:00Z",
    tags: ["architecture", "data", "engineering"],
    team: "Engineering",
    citations: [
      { source: "Architecture Diagram", snippet: "Shared Kafka cluster: 47 topics, 12 consumer groups across both products.", date: "Jan 25, 2026" },
    ],
  },
  {
    id: "m12",
    type: "episodic",
    title: "Board Prep: Q1 Metrics & Analytics Sunset Recommendation",
    content: "Alex Novak prepared the board deck with the following key slides:\n\n1. **Revenue**: Total ARR $12M (+18% YoY). AI Platform $7.8M (+52%), Analytics $4.2M (-8%)\n2. **Product**: AI Platform NPS 74, Analytics NPS 62. Feature velocity 3x higher on AI.\n3. **Recommendation**: Begin 12-month sunset of Analytics with full migration support\n4. **Financial model**: Short-term revenue risk of $1.2M, offset by $2.1M cost savings + accelerated AI growth\n5. **Customer plan**: Dedicated migration team, 12-month timeline, key analytics features absorbed into AI Platform\n\nBoard meeting scheduled for Feb 20, 2026.",
    timestamp: "2026-02-10T15:00:00Z",
    tags: ["metrics", "leadership", "board"],
    team: "Leadership",
    citations: [
      { source: "Board Deck Draft", snippet: "Net impact: -$1.2M short-term, +$3.3M projected 18-month benefit.", date: "Feb 10, 2026" },
    ],
  },
];

// ============================================
// OFFBOARDING — HANDOFF PACKS
// ============================================

export const offboardingEmployees = [
  employees[0], // Marcus Chen
  employees[3], // Rachel Torres
  employees[8], // Emma Walsh
];

export const handoffPacks: Record<string, HandoffPack> = {
  e1: {
    employee: employees[0], // Marcus Chen
    generatedAt: new Date().toISOString(),
    ownershipAreas: [
      {
        area: "Analytics Query Optimizer",
        description: "Core query engine handling 2M+ daily queries. Custom-built over 3 years. Includes the query planner, execution engine, and caching layer.",
        status: "needs-owner",
      },
      {
        area: "Data Pipeline Integrations",
        description: "40+ customer data warehouse connectors. Snowflake, BigQuery, Redshift, Databricks connectors were all built or maintained by Marcus.",
        status: "active",
        suggestedOwner: "Priya Sharma",
      },
      {
        area: "Performance Monitoring Dashboard",
        description: "Internal Grafana dashboards for analytics service health. Includes custom alerting rules.",
        status: "transitioning",
        suggestedOwner: "David Kim",
      },
      {
        area: "Analytics API v2",
        description: "147 REST endpoints serving enterprise customers. Marcus owns the rate limiting and authentication middleware.",
        status: "needs-owner",
      },
    ],
    keyLinks: [
      { title: "Analytics Engine Repository", url: "github.com/meridian/analytics-engine", category: "Code" },
      { title: "Pipeline Configuration", url: "github.com/meridian/pipeline-config", category: "Code" },
      { title: "Grafana Monitoring", url: "grafana.internal/d/analytics", category: "Monitoring" },
      { title: "Architecture Documentation", url: "notion.so/meridian/analytics-arch", category: "Docs" },
      { title: "On-Call Runbook", url: "notion.so/meridian/analytics-runbook", category: "Docs" },
      { title: "PagerDuty Service", url: "pagerduty.com/meridian/analytics", category: "Operations" },
      { title: "Query Optimizer Design Doc", url: "notion.so/meridian/query-optimizer", category: "Docs" },
      { title: "Customer Connector Specs", url: "notion.so/meridian/connectors", category: "Docs" },
    ],
    unresolvedWork: [
      {
        title: "Analytics pipeline memory leak (intermittent)",
        priority: "critical",
        description: "Connection pool exhaustion under high load. Marcus identified the likely cause (legacy pooling library) but hasn't implemented the PgBouncer migration yet. Draft PR #823 has partial work.",
        deadline: "Feb 28, 2026",
      },
      {
        title: "Customer data export optimization",
        priority: "high",
        description: "3 enterprise customers (TechFlow, DataSync, CloudNine) waiting on faster bulk export. Marcus had a draft PR (#847) with a streaming export implementation ready for review.",
        deadline: "Mar 15, 2026",
      },
      {
        title: "Dashboard v2 migration",
        priority: "medium",
        description: "Migration from Dashboard v1 to v2 is 60% complete. The data layer is done, remaining work is frontend. Priya has been shadowing Marcus on this.",
      },
      {
        title: "API documentation update",
        priority: "low",
        description: "API docs for v2 endpoints are incomplete. 34 of 147 endpoints lack documentation. Marcus was updating them incrementally.",
      },
    ],
    summaryBullets: [
      "Marcus built and maintained the core analytics engine for 4 years. He has deep, undocumented knowledge of the query optimizer — schedule a knowledge transfer session before his last day.",
      "The analytics pipeline has an intermittent memory leak (connection pool exhaustion under load). Marcus identified the cause and has partial work in PR #823. This is the highest priority handoff item.",
      "Three enterprise customers are waiting on the data export optimization (PR #847). This PR is ready for review and should be prioritized.",
      "The query optimizer has essentially zero documentation. It's the single biggest knowledge risk. Ask Marcus to record a technical walkthrough video.",
      "Priya Sharma has been shadowing Marcus on the dashboard migration and is the best candidate to absorb his analytics work. David Kim should take architectural ownership.",
      "Marcus is the primary on-call for the analytics service. Remove him from the PagerDuty rotation and redistribute to the team before his last day.",
    ],
  },
  e4: {
    employee: employees[3], // Rachel Torres
    generatedAt: new Date().toISOString(),
    ownershipAreas: [
      { area: "TechFlow Account ($3.2M)", description: "Largest enterprise opportunity. In security review stage. CTO Maria Santos is decision maker.", status: "active", suggestedOwner: "James Liu" },
      { area: "DataSync Account ($1.8M)", description: "Mid-stage enterprise deal. Technical eval complete, entering procurement.", status: "active", suggestedOwner: "James Liu" },
      { area: "CloudNine Account ($1.1M)", description: "Early-stage evaluation. Good momentum but no champion identified yet.", status: "transitioning" },
      { area: "Vertex Account ($300K)", description: "Small enterprise deal, close to signature. Low complexity.", status: "active", suggestedOwner: "Nina Patel" },
    ],
    keyLinks: [
      { title: "Salesforce Pipeline", url: "salesforce.com/pipeline/rachel-torres", category: "CRM" },
      { title: "TechFlow Deal Room", url: "notion.so/meridian/techflow-deal", category: "Deals" },
      { title: "Enterprise Demo Script", url: "notion.so/meridian/demo-script", category: "Sales" },
      { title: "Competitive Battle Cards", url: "notion.so/meridian/battle-cards", category: "Sales" },
    ],
    unresolvedWork: [
      { title: "TechFlow security questionnaire response", priority: "critical", description: "Due by Feb 20. 60% complete. Needs engineering input on SSO timeline.", deadline: "Feb 20, 2026" },
      { title: "DataSync contract negotiation", priority: "high", description: "Legal is reviewing. Rachel had verbal agreement on pricing. Need to close by Mar 1." },
      { title: "CloudNine champion identification", priority: "medium", description: "No internal champion yet. Rachel had 2 contacts but no executive sponsor." },
    ],
    summaryBullets: [
      "Rachel manages $6.4M in active pipeline across 4 accounts. TechFlow ($3.2M) is the most critical and time-sensitive.",
      "TechFlow's security questionnaire is 60% complete and due Feb 20. The new owner needs to coordinate with David Kim on SSO timeline answers.",
      "Rachel has strong personal relationships with TechFlow CTO (Maria Santos) and DataSync VP Eng. Warm introductions are essential.",
      "The DataSync contract has verbal pricing agreement — don't renegotiate. Just close it.",
      "CloudNine is the riskiest handoff — no champion identified. Consider deprioritizing if capacity is limited.",
    ],
  },
  e9: {
    employee: employees[8], // Emma Walsh
    generatedAt: new Date().toISOString(),
    ownershipAreas: [
      { area: "AI Platform Product Roadmap", description: "Q1-Q2 roadmap including enterprise features, AI anomaly detection, and platform consolidation.", status: "active" },
      { area: "Feature Prioritization Framework", description: "Scoring model for feature requests. Used in weekly product sync.", status: "active", suggestedOwner: "Alex Novak" },
      { area: "Customer Feedback Loop", description: "Bi-weekly sync with Sofia Martinez to review customer feedback and translate into product requirements.", status: "transitioning" },
      { area: "Sprint Ceremonies", description: "Owns sprint planning, backlog grooming, and retros for the AI platform team.", status: "needs-owner" },
    ],
    keyLinks: [
      { title: "Product Roadmap (Linear)", url: "linear.app/meridian/roadmap", category: "Product" },
      { title: "Feature Request Board", url: "notion.so/meridian/feature-requests", category: "Product" },
      { title: "PRD Templates", url: "notion.so/meridian/prd-templates", category: "Docs" },
      { title: "Customer Feedback Tracker", url: "notion.so/meridian/feedback", category: "Product" },
      { title: "Sprint Board", url: "linear.app/meridian/sprint", category: "Engineering" },
    ],
    unresolvedWork: [
      { title: "AI Anomaly Detection v2 PRD", priority: "high", description: "Draft PRD for next iteration. Customer feedback incorporated but engineering review pending.", deadline: "Feb 21, 2026" },
      { title: "Analytics migration feature scoping", priority: "medium", description: "If analytics sunset approved, need to scope which analytics features get rebuilt in AI platform." },
      { title: "Q2 roadmap planning", priority: "medium", description: "Started but only 30% complete. Needs input from engineering and sales.", deadline: "Mar 1, 2026" },
    ],
    summaryBullets: [
      "Emma owns the AI Platform roadmap end-to-end. The Q1 priorities are well-defined but Q2 planning is only 30% complete.",
      "The feature prioritization framework she built is critical — it's used in every weekly product sync. Alex Novak should own this.",
      "The AI Anomaly Detection v2 PRD needs engineering review by Feb 21. David Kim is the reviewer.",
      "Emma has a strong working relationship with Sofia Martinez for customer feedback. The new PM should maintain this bi-weekly sync.",
      "Sprint ceremonies (planning, grooming, retros) need an immediate owner. The engineering team is used to Emma facilitating these.",
    ],
  },
};

// ============================================
// AGENT CLONE PROFILES
// ============================================

export const cloneProfiles: CloneProfile[] = [
  {
    employee: employees[0], // Marcus Chen
    personality: "Deeply technical, passionate about the analytics engine he built. Speaks with pride about the system but can be protective. Values craftsmanship and thorough engineering.",
    expertise: ["Analytics query optimizer", "Data pipeline architecture", "Performance tuning", "Customer data integrations"],
    suggestedQuestions: [
      "How does the analytics query optimizer work?",
      "What are the biggest technical risks if we sunset Analytics?",
      "What's the status of the pipeline memory leak?",
      "Walk me through the customer data warehouse integrations.",
    ],
  },
  {
    employee: employees[2], // David Kim
    personality: "Strategic thinker, methodical and detail-oriented. Advocates strongly for platform consolidation. Communicates with clarity and always ties back to architectural principles.",
    expertise: ["Platform architecture", "v3 rewrite", "System design", "Engineering hiring", "SSO integration"],
    suggestedQuestions: [
      "What's the v3 architecture and rollout plan?",
      "Where does SSO integration stand right now?",
      "What happens to shared infrastructure if we sunset Analytics?",
      "How are the open engineering positions affecting the timeline?",
    ],
  },
  {
    employee: employees[3], // Rachel Torres
    personality: "Confident, data-driven, always connects back to revenue impact. Protective of customer relationships. Speaks with urgency about deal timelines.",
    expertise: ["Enterprise deals", "TechFlow account", "Pipeline management", "Customer relationships", "Security requirements"],
    suggestedQuestions: [
      "What's the status of the TechFlow deal?",
      "How would sunsetting Analytics affect the sales pipeline?",
      "What are TechFlow's specific security requirements?",
      "Which customers are most at risk of churning?",
    ],
  },
  {
    employee: employees[4], // James Liu
    personality: "Seasoned sales leader, thinks in terms of revenue models and market timing. Pragmatic — acknowledges strategic logic but fights for realistic timelines.",
    expertise: ["Sales strategy", "Revenue forecasting", "Enterprise deal process", "Team management", "Pricing"],
    suggestedQuestions: [
      "What's the revenue impact of sunsetting Analytics?",
      "How should we structure the customer transition timeline?",
      "What's the current state of the sales pipeline?",
      "How is Competitor X affecting our deals?",
    ],
  },
  {
    employee: employees[6], // Sofia Martinez
    personality: "Empathetic, customer-first mindset. Deep knowledge of customer health metrics. Concerned about churn risk and always advocates for the customer experience.",
    expertise: ["Customer health", "Churn risk", "Support operations", "NPS analysis", "Account management"],
    suggestedQuestions: [
      "Which customers would be most affected by an Analytics sunset?",
      "What does the customer health data tell us?",
      "What are the biggest support pain points right now?",
      "How do analytics-only customers differ from mixed-use ones?",
    ],
  },
  {
    employee: employees[8], // Emma Walsh
    personality: "Product-minded, focuses on outcomes over outputs. Frustrated by resource contention. Communicates decisions with clear rationale and data backing.",
    expertise: ["Product roadmap", "Feature prioritization", "AI platform features", "Sprint management", "Customer feedback synthesis"],
    suggestedQuestions: [
      "What are the Q1 product priorities?",
      "How do you prioritize feature requests?",
      "What feedback are we getting about the AI platform?",
      "What would the roadmap look like if Analytics is sunset?",
    ],
  },
  {
    employee: employees[9], // Alex Novak
    personality: "Big-picture strategist. Speaks confidently about company direction. Has been pushing for consolidation for months and has data to back every argument.",
    expertise: ["Product strategy", "Company direction", "Analytics sunset planning", "Board-level communication", "Competitive landscape"],
    suggestedQuestions: [
      "What's the strategic case for sunsetting Analytics?",
      "What does the competitive landscape look like?",
      "What's the board's perspective on product consolidation?",
      "How would you handle the customer migration?",
    ],
  },
  {
    employee: employees[1], // Priya Sharma
    personality: "Thoughtful and balanced. Sees both sides of technical debates. Relatively newer, brings a fresh perspective but also has real concerns about team impact.",
    expertise: ["Frontend development", "Dashboard migration", "Technical debt", "Sprint workflow", "Testing"],
    suggestedQuestions: [
      "What's the state of the dashboard v2 migration?",
      "How much time does analytics maintenance take?",
      "What's the team morale like on the engineering team?",
      "What would you need to feel good about the Analytics sunset?",
    ],
  },
  {
    employee: employees[10], // Kai Tanaka
    personality: "Design-focused, values consistency and user experience. Practical about the challenges of maintaining two product design systems.",
    expertise: ["Design system", "UX consistency", "Product design", "Design team workflow"],
    suggestedQuestions: [
      "What's the state of the design system across products?",
      "How does maintaining two products affect design quality?",
      "What UX improvements would consolidation unlock?",
      "How is the design system migration going?",
    ],
  },
  {
    employee: employees[11], // Lisa Park
    personality: "Brand-conscious, thinks about narrative and market perception. Practical about messaging challenges. Always considers how decisions look externally.",
    expertise: ["Brand positioning", "Market messaging", "Content strategy", "Competitive positioning"],
    suggestedQuestions: [
      "How would we message an Analytics sunset to the market?",
      "What does our brand perception look like right now?",
      "How are prospects perceiving our product direction?",
      "What messaging risks should we prepare for?",
    ],
  },
  {
    employee: employees[12], // Ryan O'Brien
    personality: "Operationally-minded, thinks about cost efficiency and infrastructure reliability. Direct communicator focused on metrics and systems.",
    expertise: ["Infrastructure costs", "Operational efficiency", "Incident management", "DevOps"],
    suggestedQuestions: [
      "What's the infrastructure cost breakdown for both products?",
      "How are incidents distributed between Analytics and AI Platform?",
      "What operational savings would consolidation bring?",
      "What's the on-call burden like right now?",
    ],
  },
];

// ============================================
// CLONE CANNED RESPONSES
// ============================================

interface CannedResponse {
  keywords: string[];
  response: string;
  citations: Citation[];
}

export const cloneResponses: Record<string, CannedResponse[]> = {
  // Marcus Chen — Senior Engineer
  e1: [
    {
      keywords: ["query optimizer", "how does", "analytics engine", "work"],
      response: "The analytics query optimizer is something I've spent three years building and refining. At its core, it takes incoming analytical queries — we're handling about 2 million per day — and runs them through a multi-stage pipeline.\n\nFirst, the query planner parses the request and determines the optimal execution strategy based on data distribution across our sharded PostgreSQL setup. Then the execution engine runs the query with intelligent caching — we maintain a Redis layer that caches hot query patterns, which covers about 60% of daily volume.\n\nThe key innovation is our adaptive query rewriting — we analyze query patterns in real time and pre-compute common aggregations. This dropped our p95 latency from 4.2s to 380ms last year.\n\nThe tricky part is the connection pooling. We're using a legacy library that doesn't handle backpressure well under concurrent spikes. That's what caused the January outage. I've been meaning to migrate to PgBouncer but haven't had the bandwidth.",
      citations: [
        { source: "Architecture RFC", snippet: "Query optimizer handles 2M+ daily queries with adaptive rewriting.", date: "Jan 15, 2026" },
        { source: "Performance Dashboard", snippet: "p95 latency reduced from 4.2s to 380ms after optimizer v2 deployment.", date: "Nov 2025" },
      ],
    },
    {
      keywords: ["sunset", "discontinue", "shut down", "risk", "technical risk"],
      response: "Look, I understand the strategic arguments, but I don't think people fully appreciate the technical complexity of sunsetting Analytics.\n\nWe have 40+ customer data warehouse integrations — Snowflake, BigQuery, Redshift, Databricks — each with custom connector logic that I built over three years. These aren't simple REST API calls; they handle schema mapping, incremental syncing, error recovery, and rate limiting for each platform.\n\nThen there's the query optimizer itself. It's deeply integrated with our data layer. You can't just \"move\" 2 million queries per day to a different system overnight. The AI platform's GraphQL layer wasn't designed for this kind of analytical workload.\n\nAnd honestly? I'm worried about what happens to my team. We have 6 people on the analytics team. Has anyone talked about what their roles look like if this product goes away?",
      citations: [
        { source: "Architecture Diagram", snippet: "40+ customer data warehouse connectors with custom sync logic.", date: "Jan 15, 2026" },
        { source: "Slack #engineering", snippet: "The analytics query optimizer handles 2M+ queries/day. We can't just sunset that without a migration path.", date: "Jan 28, 2026" },
      ],
    },
    {
      keywords: ["memory leak", "pipeline", "outage", "connection pool", "bug"],
      response: "Yeah, the memory leak. I know exactly what's going on — it's the connection pooling library. Under high concurrent load, the legacy library doesn't release connections back to the pool properly. RSS climbs until the query optimizer OOMs.\n\nI've got a partial fix in PR #823 that migrates the hot path to PgBouncer. It works in staging but I haven't had time to do the full production migration because it requires updating 12 configuration files across our deployment manifests, and I want to do proper load testing first.\n\nThe workaround right now is just restarting the service when RSS hits 4GB. It's not great — we've had to do manual restarts 5 times in the last month. But the permanent fix is maybe a week of focused work. I just keep getting pulled into other things.",
      citations: [
        { source: "Post-Mortem Doc", snippet: "Root cause: legacy connection pool library lacks backpressure handling.", date: "Jan 20, 2026" },
        { source: "Incident Log", snippet: "5 manual restarts of query optimizer in last 30 days.", date: "Jan 10, 2026" },
      ],
    },
    {
      keywords: ["integration", "warehouse", "connector", "snowflake", "bigquery"],
      response: "The customer data warehouse integrations are probably the most complex part of the analytics stack. We support Snowflake, BigQuery, Redshift, Databricks, and about 36 custom API connectors.\n\nEach connector has three layers: the authentication handler (OAuth, service accounts, etc.), the schema mapper that translates customer schemas to our internal model, and the sync engine that handles incremental updates.\n\nThe Snowflake connector is the most mature — 18 customers use it and it handles about 800K daily syncs. BigQuery is second with 12 customers. The tricky ones are the custom API connectors — they each have unique rate limiting and pagination logic.\n\nIf we're serious about sunset, someone needs to figure out which of these integrations can be rebuilt on the AI platform. I'd estimate 3-4 months of engineering work minimum, and that's if you have someone who understands the quirks of each warehouse platform.",
      citations: [
        { source: "Connector Health Dashboard", snippet: "42 active connectors across 5 platforms. Snowflake: 18 customers, BigQuery: 12.", date: "Feb 1, 2026" },
      ],
    },
  ],

  // David Kim — Staff Engineer
  e3: [
    {
      keywords: ["v3", "architecture", "rewrite", "rollout", "plan"],
      response: "The v3 architecture is a complete rethink of our platform layer. The key change is moving to a proper multi-tenant architecture with org-level isolation — something the current system handles poorly.\n\nWe're doing it in three phases:\n\n**Phase 1 (March 1):** Core platform + SSO. This is the foundation — new authentication layer with SAML and OIDC support, tenant isolation, and the new API gateway. SSO SAML is passing all tests, OIDC needs about a week more.\n\n**Phase 2 (March 15):** Audit logging + advanced permissions. We decided to go with an event stream approach rather than full immutable logging — it meets enterprise requirements while keeping complexity manageable.\n\n**Phase 3 (April 1):** Migration tooling + documentation. This is where we build the tools to move existing customers to v3.\n\nThe team is at 6/8 capacity with two open positions. If we fill them by end of February, we're on track. If not, Phase 2 might slip 1-2 weeks.",
      citations: [
        { source: "Architecture RFC", snippet: "v3: multi-tenant architecture with org-level isolation. Phased rollout Mar 1 → Mar 15 → Apr 1.", date: "Jan 18, 2026" },
        { source: "Eng All-Hands", snippet: "v3 is not just a rewrite — it's our ticket to the enterprise market.", date: "Jan 5, 2026" },
      ],
    },
    {
      keywords: ["sso", "saml", "oidc", "authentication", "security"],
      response: "SSO is in good shape. SAML integration is complete and passing all our test suites — we're running it against Okta, Azure AD, and OneLogin. OIDC support needs about one more week; we've got the core flow working but the token refresh logic needs hardening.\n\nThe key technical decision was building SSO as a separate authentication service rather than bolting it onto the existing auth. This gives us cleaner isolation and makes it easier to support custom identity providers later.\n\nTechFlow needs this by March 5 for their security review. We're on track to have both SAML and OIDC fully tested by March 1, which gives us a few days of buffer. Rachel has been coordinating the early access setup.\n\nOne thing to flag: we need to update our session management to support SSO-initiated sessions alongside our existing login flow. That's about 2 days of work and it's scheduled for next sprint.",
      citations: [
        { source: "Sprint Board", snippet: "SSO SAML: all tests passing. OIDC: core flow complete, token refresh in progress.", date: "Feb 10, 2026" },
        { source: "Architecture RFC", snippet: "SSO built as separate auth service for clean isolation.", date: "Jan 18, 2026" },
      ],
    },
    {
      keywords: ["infrastructure", "shared", "kafka", "sunset", "migration"],
      response: "This is actually one of the most important technical questions around the Analytics sunset, and I don't think it gets enough attention.\n\nBoth products share a Kafka cluster — 47 topics, 12 consumer groups. They also share the primary PostgreSQL instance, though the schemas are mostly separated. And they share the Redis caching layer.\n\nIf we sunset Analytics, we can't just turn things off. We need to:\n\n1. Migrate or deprecate 23 Kafka topics that are analytics-specific\n2. Carefully remove 6 consumer groups without affecting the 6 that serve the AI platform\n3. Clean up shared Postgres schemas — there are about 15 cross-references\n4. Reconfigure Redis cache allocation\n\nThe good news is I've been thinking about this for months. I have a dependency map and a rough migration sequence. The bad news is it's at least 6-8 weeks of careful work, and you need someone who deeply understands both systems. Marcus is the obvious choice, but… well, you know the situation there.",
      citations: [
        { source: "Architecture Diagram", snippet: "Shared Kafka cluster: 47 topics, 12 consumer groups across both products.", date: "Jan 25, 2026" },
      ],
    },
    {
      keywords: ["hiring", "open positions", "team", "capacity"],
      response: "We have two open positions — a senior backend engineer and a DevOps engineer. Both have been open since early January.\n\nThe senior backend role has two strong candidates in the pipeline. One just finished the onsite and we're aiming to extend an offer this week. The DevOps role is trickier — we've had a lot of interest but the candidates have been a tier below what we need.\n\nRight now the team is at 6 of 8 engineers. Everyone is stretched. The v3 rewrite, analytics maintenance, and on-call rotation all compete for the same people. If we get the backend hire onboarded by late February, they can contribute to Phase 2. The DevOps hire is less timeline-critical but would help with the migration tooling in Phase 3.\n\nI'm also having to manage morale carefully. The team is committed to v3, but the uncertainty around Analytics is causing anxiety. Some people on Marcus's analytics team are wondering about their futures.",
      citations: [
        { source: "Hiring Dashboard", snippet: "2 open positions: senior backend (offer stage), DevOps (pipeline).", date: "Feb 12, 2026" },
      ],
    },
  ],

  // Rachel Torres — Account Executive
  e4: [
    {
      keywords: ["techflow", "deal", "status", "account"],
      response: "TechFlow is our biggest opportunity this quarter — $3.2M ARR. Let me break down where we stand.\n\n**Stage:** Security review (Stage 3). We passed the technical eval with flying colors — their VP Eng David Kim was impressed with our AI platform capabilities.\n\n**Decision maker:** CTO Maria Santos. She's the one who signed off on the eval.\n**Champion:** VP Eng David Kim (their David Kim, not ours!). He's been advocating internally for us.\n\n**The blocker:** Security review starts March 5. They have hard requirements on SSO (SAML specifically) and audit logging. Our David Kim says SSO will be ready by March 1, which gives us barely any buffer.\n\n**Competition:** Competitor X is also in the running. They have SSO today but their AI capabilities are weaker. If we miss the March deadline, TechFlow goes with them.\n\n**My confidence level:** 70% if we hit the SSO deadline, 20% if we don't. This deal is worth fighting for.",
      citations: [
        { source: "CRM Pipeline Report", snippet: "TechFlow: $3.2M ARR, Stage 3 (Security Review). Decision maker: CTO Maria Santos.", date: "Feb 10, 2026" },
        { source: "Customer Call Notes", snippet: "TechFlow's CTO: 'We chose Meridian specifically for the analytics capabilities.'", date: "Jan 22, 2026" },
      ],
    },
    {
      keywords: ["sunset", "pipeline", "revenue", "impact", "analytics"],
      response: "I have to be direct about this — sunsetting Analytics would put $2.8M in active pipeline at risk immediately.\n\nFour of my accounts specifically rely on Analytics:\n- **TechFlow** ($3.2M) — initially chose us for analytics, but staying for AI. Could survive the transition.\n- **DataSync** ($800K) — pure analytics customer. High churn risk.\n- **CloudNine** ($500K) — early stage eval, analytics-focused. Would probably walk.\n- **Vertex** ($300K) — small deal, analytics add-on. Manageable.\n\nBeyond my book, the broader team has about $4.2M in analytics-related ARR from existing customers. If we sunset without a 12-month migration plan and dedicated support, I estimate we lose 30-40% of those customers.\n\nThe message matters too. Enterprise customers hate uncertainty. If they hear \"sunset\" before we have a migration plan ready, the damage starts immediately — even before we actually turn anything off.",
      citations: [
        { source: "CRM Pipeline Report", snippet: "TechFlow ($1.2M), DataSync ($800K), CloudNine ($500K), Vertex ($300K) — all analytics-dependent.", date: "Feb 10, 2026" },
        { source: "Revenue Report Q4", snippet: "Analytics ARR: $4.2M (35% of total). YoY growth: -8%.", date: "Jan 3, 2026" },
      ],
    },
    {
      keywords: ["security", "requirement", "compliance", "questionnaire"],
      response: "Enterprise security requirements are the #1 gate for our deals right now. Here's what the top accounts need:\n\n**SSO:** Every enterprise account requires it. SAML is table stakes. OIDC is nice-to-have but becoming standard. TechFlow, DataSync, and CloudNine all list it as a hard requirement.\n\n**Audit logging:** TechFlow and DataSync specifically need this for their compliance teams. They want to see who accessed what data, when, and from where. The event stream approach David's team is building should satisfy this.\n\n**SOC 2:** We're already SOC 2 Type I certified. Type II is in progress and should be done by April. Two accounts have asked about it.\n\n**The TechFlow questionnaire:** It's 60% complete. I've answered the standard sections but need engineering input on the SSO implementation timeline and the audit log architecture. David Kim was going to review it this week.\n\nBottom line: if we nail SSO and audit logs by March, we unlock the entire enterprise pipeline. If we don't, we're dead in the water for Q1.",
      citations: [
        { source: "Security Questionnaire Tracker", snippet: "TechFlow questionnaire: 60% complete. Waiting on eng input for SSO and audit sections.", date: "Feb 11, 2026" },
      ],
    },
  ],

  // Sofia Martinez — CS Lead
  e7: [
    {
      keywords: ["customer", "health", "churn", "risk", "affected"],
      response: "I track customer health across 42 active accounts. Here's where things stand:\n\n**Health Distribution:**\n- 🟢 Healthy (NPS 70+): 24 accounts (57%)\n- 🟡 At Risk (NPS 50-69): 12 accounts (29%)\n- 🔴 Critical (NPS <50): 6 accounts (14%)\n\n**The analytics-specific picture is concerning:**\n- 15 accounts use only Analytics — zero AI platform engagement\n- Of those 15, 8 are in the \"At Risk\" or \"Critical\" category\n- If we sunset without a migration plan, I estimate 30-40% of analytics-only customers churn\n\n**The mixed-use customers are a different story:**\n- 27 accounts use both products. Their NPS averages 74 vs 62 for analytics-only.\n- These customers would likely transition, especially if we integrate key analytics features into the AI platform.\n\nThe key insight: the customers who would churn are the ones who haven't tried the AI platform. We need to give them a reason to try it *before* we talk about sunset.",
      citations: [
        { source: "Customer Health Dashboard", snippet: "42 accounts actively using analytics features. 15 have no AI platform engagement.", date: "Feb 1, 2026" },
        { source: "NPS Survey", snippet: "Analytics-only customers: NPS 62. Mixed-use customers: NPS 74.", date: "Jan 15, 2026" },
      ],
    },
    {
      keywords: ["support", "pain", "ticket", "issue", "problem"],
      response: "Support volume for Analytics has been climbing steadily. Tickets are up 45% quarter over quarter, and our average resolution time is 4.2 hours compared to 1.8 hours for the AI platform.\n\nThe top three issues are:\n1. **Query performance** (28% of tickets) — customers hitting slow queries, usually during peak hours. Related to the connection pooling issue Marcus has been working on.\n2. **Data sync failures** (22%) — connector reliability issues, especially with the custom API integrations.\n3. **Dashboard rendering** (18%) — the v1 dashboard has bugs that we've fixed in v2 but the 8 customers still on v1 keep hitting them.\n\nFrankly, the support burden is becoming unsustainable. My team spends 60% of their time on analytics issues for 35% of our revenue. If we could migrate everyone to the AI platform with a solid analytics module built in, the support load would drop dramatically.\n\nBut — and this is important — we need a migration playbook before we can tell customers anything. I refuse to let my CSMs have the sunset conversation without a concrete plan and timeline.",
      citations: [
        { source: "Support Ticket Trends", snippet: "Analytics tickets up 45% QoQ. Average resolution time: 4.2 hours (vs 1.8 for AI platform).", date: "Feb 6, 2026" },
      ],
    },
  ],

  // Emma Walsh — Product Manager
  e9: [
    {
      keywords: ["roadmap", "q1", "priorities", "plan"],
      response: "Here's the Q1 roadmap as it stands:\n\n**Priority 1 — Enterprise Features** (supports $8.7M pipeline)\n- SSO (SAML + OIDC): Engineering in progress, targeting March 1\n- Audit logging: Event stream approach, targeting March 15\n- Advanced RBAC: Complete and shipping\n\n**Priority 2 — AI Platform Enhancements**\n- Anomaly detection v2: PRD in review, targeting Q1 end\n- Natural language query interface: Early design phase\n- Custom model training: Scoped for Q2\n\n**Priority 3 — Platform Reliability**\n- 99.95% uptime SLA improvements\n- Performance monitoring dashboard\n- Disaster recovery hardening\n\nThe honest truth is that Priority 1 is consuming most of our engineering bandwidth. We deferred 3 AI platform features from Q4 because of analytics maintenance demands. If consolidation happens, Q2 would look radically different — we could actually invest fully in making the AI platform best-in-class.",
      citations: [
        { source: "Product Roadmap Review", snippet: "We deferred 3 AI platform features in Q4 due to analytics maintenance demands.", date: "Dec 20, 2025" },
        { source: "Feature Request Board", snippet: "Top 8 customer requests are all AI-platform related. Analytics requests are declining.", date: "Feb 2, 2026" },
      ],
    },
    {
      keywords: ["feature", "request", "prioritiz", "framework", "scoring"],
      response: "We use a weighted scoring model that considers four factors:\n\n1. **Revenue impact** (30% weight): How much pipeline does this unlock or protect?\n2. **Customer demand** (25%): How many customers have requested it, weighted by ARR?\n3. **Strategic alignment** (25%): Does it move us toward our AI-first vision?\n4. **Engineering effort** (20%): How much does it cost to build?\n\nEvery feature gets scored 1-10 on each dimension, then we apply the weights. The top of the board right now:\n\n1. SSO — Score: 8.7 (high revenue + high demand)\n2. Audit logging — Score: 7.9\n3. Anomaly detection v2 — Score: 7.4\n4. Natural language queries — Score: 7.1\n5. Custom model training — Score: 6.8\n\nWhat's interesting is that no analytics feature scores above 5.2 anymore. The demand signal has shifted entirely to AI capabilities. That's a big part of why I support consolidation — the market is telling us where to invest.",
      citations: [
        { source: "Feature Request Board", snippet: "Top 8 customer requests are all AI-platform related. Analytics requests are declining.", date: "Feb 2, 2026" },
      ],
    },
    {
      keywords: ["feedback", "customer", "ai platform", "what are"],
      response: "Customer feedback on the AI platform has been overwhelmingly positive. After the anomaly detection launch, our NPS jumped 12 points in the first week.\n\nThe top themes from our latest feedback synthesis:\n\n**Loves:**\n- AI-powered anomaly detection: \"This saved us 20 hours of manual analysis per week\" — DataSync\n- Natural language interface (beta): \"My non-technical team can finally query data themselves\" — CloudNine\n- Real-time insights: \"The speed compared to traditional analytics is night and day\" — TechFlow\n\n**Wants:**\n- Custom model training: 5 enterprise customers want to bring their own models\n- Better export/reporting: Legacy analytics users miss the detailed export capabilities\n- More integrations: Customers want Snowflake and BigQuery connectors on the AI side too\n\n**Concerns:**\n- Feature parity with Analytics: Some power users feel the AI platform can't do everything Analytics does\n- Pricing: A few mid-market customers think enterprise pricing is steep\n\nThe \"wants\" are actually the roadmap for post-consolidation. If we sunset Analytics, we'd take the best parts — exports, connectors, deep analytics — and rebuild them AI-native.",
      citations: [
        { source: "Sprint Metrics", snippet: "AI anomaly detection: 0 P1s, NPS +12, 94% positive feedback.", date: "Feb 7, 2026" },
        { source: "CAB Notes", snippet: "TechFlow CTO: 'We chose Meridian for analytics, but we're staying for AI.'", date: "Jan 22, 2026" },
      ],
    },
  ],

  // Alex Novak — Product Lead
  e10: [
    {
      keywords: ["strategic", "case", "sunset", "consolidat", "why"],
      response: "I've been building this case for months, and I believe it's one of the most important decisions we'll make as a company. Here's the strategic argument:\n\n**Market reality:** The analytics market is consolidating around AI-native platforms. Traditional BI tools are losing ground. Our legacy Analytics product is competing in a shrinking segment while our AI platform is in a rapidly growing one.\n\n**Revenue trajectory:** Analytics is $4.2M ARR but declining 8% year-over-year. The AI platform is $7.8M and growing 52%. In 18 months, Analytics will be under $3.5M while AI will exceed $15M.\n\n**Resource drain:** We're splitting engineering, design, and product resources across two products. Neither gets the investment it deserves. We deferred 3 AI platform features last quarter because of analytics maintenance.\n\n**The math:** Short-term, we risk $1.2M in customer churn. But we save $2.1M in operational and engineering costs, and the accelerated AI platform growth more than compensates. Net 18-month benefit: +$3.3M.\n\n**My recommendation:** 12-month sunset with a dedicated migration team, key analytics features absorbed into the AI platform, and generous customer transition support.",
      citations: [
        { source: "Strategy Memo", snippet: "The analytics market is consolidating around AI-native platforms. Our legacy product can't compete.", date: "Jan 10, 2026" },
        { source: "Board Prep Doc", snippet: "Net impact: -$1.2M short-term, +$3.3M projected 18-month benefit.", date: "Feb 10, 2026" },
      ],
    },
    {
      keywords: ["competitive", "landscape", "competitor", "market"],
      response: "The competitive landscape has shifted dramatically in the past year.\n\n**Our position:**\n- AI Platform: Strong differentiation. Our anomaly detection and NL query features are best-in-class. Win rate: 34%.\n- Analytics: Increasingly commoditized. We're competing against bigger players with more resources. Win rate: 12%.\n\n**Key competitors:**\n- **Competitor X:** Just raised $50M. Expanding enterprise sales aggressively. They have SSO today (we don't yet) but their AI capabilities are weak. If we ship SSO by March, we neutralize their main advantage.\n- **Competitor Y:** AI-native platform, growing fast. They're our real long-term threat. They don't have our analytics depth but they're iterating faster because they're focused on one product.\n- **Competitor Z:** Traditional BI incumbent. Slowly adding AI features. Not a direct threat to our AI platform but they're eating our analytics lunch.\n\nThe takeaway: we can't out-invest Competitor Z in analytics, and we can't out-innovate Competitor Y while maintaining two products. Consolidation is how we win.",
      citations: [
        { source: "Competitive Analysis 2026", snippet: "Competitor X raised $50M, expanding enterprise. AI capabilities weak but SSO is shipping.", date: "Feb 5, 2026" },
        { source: "Sales Ops Dashboard", snippet: "AI Platform win rate: 34%. Analytics win rate: 12%.", date: "Jan 5, 2026" },
      ],
    },
    {
      keywords: ["board", "perspective", "recommendation"],
      response: "The board meeting is February 20th, and I've prepared a comprehensive recommendation deck.\n\nThe board has been asking about product consolidation since Q3 last year. The CEO is broadly supportive of my recommendation — she sees the strategic logic. The board's main concerns are:\n\n1. **Customer churn risk:** They want to see a concrete migration plan, not just strategy slides. I've prepared a detailed customer-by-customer transition timeline.\n\n2. **Revenue bridge:** They need confidence that the short-term revenue hit ($1.2M) is manageable. I've modeled three scenarios: conservative (we lose 40% of analytics customers), moderate (25%), and optimistic (15%).\n\n3. **Timeline:** They think 12 months is aggressive. Some board members favor 18 months. I'll push for 12 with a clause that extends to 15 if migration metrics are behind target.\n\n4. **Team impact:** They want to know what happens to the analytics engineering team. My plan is to retrain and absorb them into the AI platform team — we have open positions that need filling anyway.\n\nI feel good about the recommendation. The data supports it clearly.",
      citations: [
        { source: "Board Deck Draft", snippet: "Recommendation: sunset Analytics within 12 months, migrate to AI platform analytics module.", date: "Feb 10, 2026" },
        { source: "Board Deck Draft", snippet: "Net impact: -$1.2M short-term, +$3.3M projected 18-month benefit.", date: "Feb 10, 2026" },
      ],
    },
  ],

  // Priya Sharma
  e2: [
    {
      keywords: ["dashboard", "migration", "v2", "v1"],
      response: "The dashboard v2 migration is about 60% complete. The data layer is fully done — all the API endpoints and data transformations are working. What's left is the frontend work: migrating the remaining chart components, the export functionality, and the custom report builder.\n\nI've been shadowing Marcus on the analytics-specific parts, so I have a decent understanding of the underlying data models. The trickiest part is the custom report builder — it's deeply tied to the old query optimizer's output format and we need to adapt it for the new data layer.\n\n8 enterprise customers are still on v1. Three of them have pushed back on migrating because they have workflows built around the v1 layout. Sofia's team is managing those conversations.\n\nTimeline-wise, I think we need 4-5 more weeks to finish the migration if I can focus on it. But with sprint work and the v3 priorities, it keeps getting deprioritized.",
      citations: [
        { source: "Sprint Board", snippet: "Dashboard v2 migration: 60% complete. Data layer done, frontend remaining.", date: "Feb 10, 2026" },
      ],
    },
    {
      keywords: ["maintenance", "technical debt", "time", "spend"],
      response: "Honestly, the maintenance burden is significant. We spend roughly 30% of each sprint on analytics maintenance — bug fixes, connector issues, performance patches. That's essentially one full engineer's time every sprint dedicated to keeping the lights on.\n\nThe technical debt is real. The analytics codebase has 43% test coverage (vs our 80% target), the frontend uses React 17 (we're on 19 everywhere else), and there are several known issues we just work around rather than fix.\n\nThe most frustrating part is context-switching. One day I'm working on the v3 platform — exciting, new architecture — and the next day I'm debugging a Redshift connector that hasn't been properly updated in 18 months. It's demoralizing.\n\nThat said, I don't think people appreciate how much institutional knowledge the analytics team has. If we sunset without proper knowledge transfer, we're going to hit issues that only Marcus or I can diagnose.",
      citations: [
        { source: "Sprint Retro Notes", snippet: "We spend ~30% of each sprint on analytics maintenance. That's not sustainable.", date: "Feb 7, 2026" },
      ],
    },
  ],

  // Kai Tanaka — Design
  e11: [
    {
      keywords: ["design system", "state", "components", "consistency"],
      response: "The design system situation is, frankly, a mess. We have 487 unique components across both products, and only 31% are shared. That means 69% of our components exist in two different versions — one for Analytics, one for AI Platform.\n\nWe adopted a new unified design system in December, but the migration is slow because every change to a shared component needs to be tested against both products. My team spends about 40% of our time on consistency QA rather than actual design work.\n\nThe AI Platform is about 70% migrated to the new system. Analytics is at maybe 25% — it keeps getting deprioritized because the engineers are focused on maintenance and the v3 rewrite.\n\nConsolidation would be transformative for design. Instead of maintaining two half-baked experiences, we could focus on building one exceptional product with a cohesive design language. I've already drafted concepts for an \"AI Analytics\" module that would bring the best of both products together.",
      citations: [
        { source: "Design System Audit", snippet: "487 unique components across both products. Only 31% are shared.", date: "Jan 20, 2026" },
      ],
    },
  ],

  // Lisa Park — Marketing
  e12: [
    {
      keywords: ["message", "messaging", "narrative", "sunset", "communicate", "market"],
      response: "This is going to be one of the trickiest messaging challenges we've faced. You don't say \"we're killing our product\" — you say \"we're evolving our platform.\"\n\nHere's my proposed messaging framework:\n\n**External narrative:** \"Meridian Analytics is evolving into Meridian AI Analytics — bringing the analytical depth you trust with the AI capabilities you've been asking for.\"\n\n**Key messaging pillars:**\n1. Evolution, not discontinuation\n2. Every analytics feature you rely on, enhanced with AI\n3. Dedicated migration support with 12-month timeline\n4. No disruption to existing workflows during transition\n\n**Risks I'm concerned about:**\n- Competitor X will use this against us in deals. I need 2-3 months to prepare counter-messaging.\n- Tech press might frame it as a retreat. We need to control the narrative with a proactive announcement, not let it leak.\n- 72% of prospects associate Meridian with \"reliable enterprise analytics.\" We need to shift that perception carefully without losing trust.\n\nI strongly recommend we don't announce anything publicly until we have the migration plan, the timeline, and the first beta of the AI analytics module ready to show.",
      citations: [
        { source: "Brand Perception Study", snippet: "72% of prospects associate Meridian with 'reliable enterprise analytics.'", date: "Dec 15, 2025" },
        { source: "Marketing Sync", snippet: "We need a migration narrative: 'Analytics is evolving into AI-powered insights.'", date: "Feb 7, 2026" },
      ],
    },
  ],

  // Ryan O'Brien — Operations
  e13: [
    {
      keywords: ["infrastructure", "cost", "breakdown", "expense", "savings"],
      response: "Here's the infrastructure cost breakdown:\n\n**Analytics:** $47K/month\n- Compute (query optimizer, connectors): $28K\n- Storage (PostgreSQL, S3 data lake): $11K\n- Monitoring + alerting: $4K\n- CDN + networking: $4K\n\n**AI Platform:** $62K/month\n- Compute (ML inference, API servers): $38K\n- Storage (PostgreSQL, model storage): $12K\n- GPU instances (model training): $7K\n- Monitoring + networking: $5K\n\n**Shared services:** $23K/month\n- Kafka cluster: $9K\n- Redis cache: $6K\n- CI/CD + DevOps tooling: $5K\n- Security + compliance: $3K\n\n**Total: $132K/month ($1.58M/year)**\n\nIf we consolidate, I estimate we can eliminate $35-40K/month in analytics-specific infrastructure. Plus we'd reduce shared service costs by about $8K as utilization simplifies. That's roughly $500-575K annual savings on infrastructure alone — not counting the engineering time savings.",
      citations: [
        { source: "Infrastructure Cost Report", snippet: "Analytics infra: $47K/month. AI platform: $62K/month. Shared services: $23K/month.", date: "Jan 31, 2026" },
        { source: "Incident Log", snippet: "3 of the last 5 P1 incidents originated in analytics-specific infrastructure.", date: "Feb 9, 2026" },
      ],
    },
    {
      keywords: ["incident", "on-call", "burden", "outage"],
      response: "The on-call situation tells a pretty clear story. In the last 30 days:\n\n- **Total incidents:** 8\n- **Analytics-related:** 5 (63%)\n- **AI Platform-related:** 2 (25%)\n- **Shared infra:** 1 (12%)\n\nAnalytics is generating the majority of our incidents while serving a minority of our revenue. The query optimizer alone required 5 manual restarts — that's Marcus or one of his team getting paged at 2am.\n\nThe on-call rotation currently has 8 people, but only 3 of them (Marcus, Priya, and David) can handle analytics-specific incidents. That's not sustainable. If Marcus leaves — which I hear might be happening — we're down to 2 people who can respond to analytics outages.\n\nConsolidation would dramatically improve the on-call experience. One product, one infrastructure stack, one runbook. I'd estimate we cut incident volume by at least 50% and on-call burden by 60%.",
      citations: [
        { source: "Incident Log", snippet: "3 of the last 5 P1 incidents originated in analytics-specific infrastructure.", date: "Feb 9, 2026" },
        { source: "On-Call Report", snippet: "Analytics: 5 incidents, 3 on-call engineers qualified. AI Platform: 2 incidents, 8 engineers qualified.", date: "Feb 12, 2026" },
      ],
    },
  ],

  // James Liu — Sales Director
  e5: [
    {
      keywords: ["revenue", "impact", "forecast", "sunset", "analytics"],
      response: "Let me walk you through the revenue model, because I think the numbers tell a nuanced story.\n\n**Current state:**\n- Total ARR: $12M\n- AI Platform: $7.8M (65%, growing 52% YoY)\n- Analytics: $4.2M (35%, declining 8% YoY)\n\n**If we sunset Analytics (12-month timeline):**\n- Best case: Migrate 85% of analytics revenue to AI Platform. Net loss: ~$630K\n- Base case: Migrate 70%. Net loss: ~$1.26M\n- Worst case: Migrate 55%. Net loss: ~$1.89M\n\nBut here's what most people miss — the *cost* of keeping Analytics alive:\n- Engineering resources: ~$1.5M/year in salary allocation\n- Infrastructure: ~$564K/year\n- Support burden: ~$400K/year in CS time\n- Opportunity cost of delayed AI features: Hard to quantify, but real\n\nSo even in the base case, the 18-month economics favor consolidation. My concern isn't the strategy — it's the *timing*. We have $8.7M in Q1 pipeline, and 3 deals that need Analytics features for their eval. I'd prefer to close Q1, then announce the transition in Q2.",
      citations: [
        { source: "Revenue Report Q4", snippet: "Analytics ARR: $4.2M (35% of total). YoY growth: -8%.", date: "Jan 3, 2026" },
        { source: "Sales Team Sync", snippet: "We need at least 12 months to migrate enterprise customers without churn.", date: "Feb 5, 2026" },
      ],
    },
    {
      keywords: ["competitor", "competition", "competitor x", "threat"],
      response: "Competitor X is our biggest near-term threat. They just raised $50M and they're spending aggressively on enterprise sales. We're seeing them in about 40% of our competitive deals now, up from 25% last quarter.\n\n**Their strengths:** SSO is shipping today. They have a SOC 2 Type II cert. Their enterprise sales team has grown from 8 to 20 in the last 6 months.\n\n**Their weaknesses:** AI capabilities are basic — mostly repackaged dashboards with a chatbot layer. Their data integration story is weak compared to ours. And their pricing is aggressive (read: unsustainable at their burn rate).\n\n**How we're responding:** We're leading every deal with our AI differentiation. Rachel's win against them at TechFlow was based entirely on our anomaly detection demo. Once we ship SSO, their main enterprise advantage evaporates.\n\nLonger term, I'm more worried about Competitor Y — they're AI-native and iterating fast. That's actually another argument for consolidation: we need to focus resources to stay ahead.",
      citations: [
        { source: "Competitive Analysis 2026", snippet: "Competitor X raised $50M, expanding enterprise. AI capabilities weak but SSO is shipping.", date: "Feb 5, 2026" },
      ],
    },
  ],

  // Nina Patel — SDR Lead
  e6: [
    {
      keywords: ["inbound", "lead", "pipeline", "prospect"],
      response: "The inbound picture is really clear: 78% of Q1 leads mention AI capabilities as their primary interest. Only 12% are looking for traditional analytics. The remaining 10% are mixed.\n\nWe've shifted our outbound messaging accordingly. All our sequences now lead with the AI platform story and position analytics as a supporting feature. It's working — our response rates are up 23% since the messaging change in January.\n\nFrom an SDR perspective, sunsetting Analytics wouldn't really affect our prospecting motion. New business is almost entirely AI-driven. The impact is mainly on existing customers — that's Rachel and James's territory.\n\nOne thing I'd flag: we're getting more inbound from Competitor X's customers who are dissatisfied with their AI capabilities. If we consolidate and ship a strong AI analytics module, there's a real conquest opportunity there.",
      citations: [
        { source: "Inbound Lead Analysis", snippet: "78% of Q1 inbound leads mention AI capabilities, only 12% mention analytics.", date: "Feb 8, 2026" },
      ],
    },
  ],

  // Tom Bradley — CS Manager
  e8: [
    {
      keywords: ["support", "ticket", "analytics", "migration"],
      response: "I'm seeing the maintenance burden from the customer side. Analytics tickets are up 45% QoQ, and the issues are getting more complex. Our average resolution time for analytics is 4.2 hours — more than double the 1.8 hours for AI platform issues.\n\nThe migration question is really about readiness. I've been thinking about what a \"migration playbook\" would look like:\n\n1. **Assessment phase** (2 weeks per customer): Map their analytics usage, identify which features they need in AI platform, flag any custom integrations.\n2. **Parallel run** (4-6 weeks): Both products running side by side so customers can validate.\n3. **Migration** (2-3 weeks): Data migration, workflow retraining, validation.\n4. **Cutover + support** (2 weeks): Go live with dedicated CS support.\n\nSo each customer takes roughly 10-13 weeks. With a migration team of 3, we could handle 4 customers in parallel. For 42 accounts, that's about 11 months. Tight, but doable with a 12-month timeline.\n\nI'd support the sunset if — and only if — we get the migration team staffed before we announce anything.",
      citations: [
        { source: "Support Ticket Trends", snippet: "Analytics tickets up 45% QoQ. Average resolution time: 4.2 hours (vs 1.8 for AI platform).", date: "Feb 6, 2026" },
      ],
    },
  ],
};

// ---- Generic fallback response per employee ----
export const cloneFallbackResponses: Record<string, string> = {
  e1: "That's an interesting question. From my perspective as someone who built the analytics engine, I'd want to think about the technical implications carefully. The analytics stack is complex — 40+ integrations, 2M daily queries — and any changes need to account for that complexity. What specific aspect are you most concerned about?",
  e2: "Good question. I've been on the engineering team for two years now, working across both the analytics maintenance and the v3 platform work. I can share my perspective, but keep in mind I see both the frustrations of maintaining the legacy system and the potential of the new platform. What angle would be most helpful?",
  e3: "From an architecture standpoint, there are several considerations here. I've been thinking about platform consolidation for a while and have a pretty clear view of the technical landscape. The shared infrastructure — Kafka, PostgreSQL, Redis — adds complexity to any major change. Let me know if you want me to dive deeper into any specific area.",
  e4: "From a sales perspective, everything ultimately comes back to revenue impact and customer trust. I can share what I'm seeing in the field — our enterprise customers are sophisticated and they notice uncertainty. What I can tell you is that our AI platform story is compelling, but we need to execute on enterprise features to close deals.",
  e5: "As someone managing the full sales team, I try to balance short-term revenue protection with long-term strategic positioning. The numbers tell a clear story — AI is where the growth is. But timing and execution matter more than strategy alone. What specifically would you like my take on?",
  e6: "I can share what I'm seeing from the inbound and outbound pipeline. The short version is that the market has largely moved to AI-first analytics. Our prospecting reflects that shift. Happy to dig into any specific area.",
  e7: "My view is always grounded in what customers are actually experiencing. I work with 42 accounts daily and I see the patterns — what's working, what's breaking, where the satisfaction gaps are. I'm happy to share specifics on any customer segment or issue.",
  e8: "From the support and migration side, I think about operational feasibility. Any major product change needs a concrete plan — not just strategy slides but actual playbooks, timelines, and resourcing. What would you like to know?",
  e9: "Product decisions should always be grounded in data — customer demand, feature adoption, competitive positioning. I can share how I think about prioritization and what the signals are telling us right now.",
  e10: "That's a strategic question I've been spending a lot of time on. The product landscape is shifting fast and we need to be deliberate about where we invest. I've got data to back up most of my positions — what would be most useful?",
  e11: "From a design perspective, I think about user experience consistency and the quality of what we ship. Maintaining two products means neither gets our best work. I can speak to the design implications of any decision we're considering.",
  e12: "Everything has a narrative dimension. How we communicate decisions — internally and externally — is as important as the decisions themselves. I think about market perception, brand impact, and messaging strategy. What's on your mind?",
  e13: "I look at things through an operational lens — infrastructure costs, incident rates, on-call burden, system reliability. The data usually makes the case pretty clearly. What would you like me to walk through?",
};
