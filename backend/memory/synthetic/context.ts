import type { SeededRng } from "./random";

export interface SyntheticPerson {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface SyntheticProject {
  key: string;
  name: string;
  repo: string;
  channel: string;
  channel_id: string;
  notion_page_id: string;
  jira_board_id: string;
  gdrive_folder_id: string;
  target_date: string;
}

export interface SyntheticConflict {
  topic: string;
  side_a: { position: string; person_role: string };
  side_b: { position: string; person_role: string };
  passive_aggressive: string[];
  heated_exchange: string[];
}

export interface SyntheticWorld {
  cloneId: string;
  people: SyntheticPerson[];
  projects: SyntheticProject[];
  conflicts: SyntheticConflict[];
}

const CONFLICTS: SyntheticConflict[] = [
  {
    topic: "launch timeline",
    side_a: { position: "We need to ship by the deadline no matter what. Revenue depends on it.", person_role: "Sales" },
    side_b: { position: "Shipping broken software will cost us more than a delayed launch.", person_role: "Engineering" },
    passive_aggressive: [
      "As I've mentioned in our last three meetings, the timeline hasn't changed.",
      "I'm sure engineering will find a way, they always do (eventually).",
      "Per my previous email, this was supposed to be done two weeks ago.",
      "Just want to make sure we're all aligned, since last time there was some... confusion.",
      "Happy to discuss again, though I believe we already resolved this on Monday.",
      "Looping in leadership for visibility, since this keeps coming up.",
    ],
    heated_exchange: [
      "This is the third time we've moved the goalposts. At some point we need to commit.",
      "I'm not going to burn out my team so sales can close one deal faster.",
      "If we miss this quarter, that's on whoever decided to add scope last week.",
      "Respectfully, I don't think you understand the technical complexity here.",
      "We can either do it right or do it fast. Pick one.",
      "I've been saying this for weeks and nobody listened. Now it's a crisis.",
    ],
  },
  {
    topic: "resource allocation",
    side_a: { position: "My team is understaffed and overcommitted. Something has to give.", person_role: "Engineering" },
    side_b: { position: "Every team is stretched. We need to prioritize, not hire.", person_role: "Finance" },
    passive_aggressive: [
      "I appreciate the suggestion, but we've already tried that approach. Twice.",
      "Sure, we can take that on too. Just let me know which other project to kill.",
      "Thanks for volunteering my team for yet another initiative.",
      "I'll add it to the list of things we're 'deprioritizing' but somehow still doing.",
      "Glad we're 'aligned' again. Same alignment as last sprint, I assume.",
    ],
    heated_exchange: [
      "You can't keep asking for more with the same headcount. The math doesn't work.",
      "If this isn't a priority then take it off our plate. Don't just say it's 'flexible.'",
      "We lost two senior engineers last month. Pretending we're fine is delusional.",
      "I'm tired of every planning session turning into a wish list with no trade-offs.",
      "Either fund the team properly or accept the timeline. There's no third option.",
    ],
  },
  {
    topic: "technical direction",
    side_a: { position: "We should rebuild from scratch. The current system is unmaintainable.", person_role: "Engineering" },
    side_b: { position: "A rewrite is a vanity project. Iterate on what we have.", person_role: "Product" },
    passive_aggressive: [
      "I'm sure the 'quick fix' approach will work this time, unlike the last four times.",
      "Looking forward to debugging this again in three months when it breaks.",
      "Bold strategy to add more duct tape to the duct tape.",
      "I documented my concerns in the RFC. Whether anyone reads it is another matter.",
      "The tech debt spreadsheet is getting its own tab now, so that's fun.",
    ],
    heated_exchange: [
      "We've been 'iterating' for two years and the codebase is worse than when we started.",
      "A rewrite will take 6 months, cost $500K, and deliver exactly what we have today.",
      "If we can't maintain it, that's an engineering problem, not an architecture problem.",
      "I refuse to ship another feature on top of this house of cards.",
      "Show me one rewrite that came in on time and on budget. I'll wait.",
    ],
  },
  {
    topic: "customer escalation",
    side_a: { position: "The customer is threatening to churn. We need to fix this NOW.", person_role: "Sales" },
    side_b: { position: "One customer doesn't get to hijack our entire roadmap.", person_role: "Product" },
    passive_aggressive: [
      "I understand engineering has priorities. So does the customer paying us $2M/year.",
      "Maybe we should tell them our internal process is more important than their business.",
      "I'll let the customer know we'll get to it 'next quarter.' I'm sure they'll understand.",
      "Great, another 'strategic discussion' while the customer shops competitors.",
      "Adding this to the ever-growing list of things we'll 'circle back' on.",
    ],
    heated_exchange: [
      "If we lose this account, everyone in this room shares the blame.",
      "Stop using customers as leverage to skip the prioritization process.",
      "This is exactly how we got into this mess -- jumping every time a customer yells.",
      "I don't care whose fault it is. Fix it or explain to the board why we lost $2M ARR.",
      "We are not a consulting firm. We build a product. One customer doesn't dictate the roadmap.",
    ],
  },
  {
    topic: "ownership and accountability",
    side_a: { position: "Nobody owns this. It fell through the cracks because of unclear responsibilities.", person_role: "Product" },
    side_b: { position: "It was clearly assigned. Someone dropped the ball.", person_role: "Engineering" },
    passive_aggressive: [
      "Interesting that nobody remembers volunteering for this.",
      "I have the Slack thread where this was assigned, if that helps.",
      "I assumed someone was on it. My mistake for assuming, I guess.",
      "For future reference, maybe we should write things down. Oh wait, we did.",
      "I'll own it going forward, since apparently that's the only way things get done.",
    ],
    heated_exchange: [
      "This is a pattern. Every quarter something critical gets dropped and nobody is accountable.",
      "Don't point fingers at my team when the requirements changed three times.",
      "I'm not going to sit here and pretend this wasn't a leadership failure.",
      "If ownership is unclear, that's a management problem, full stop.",
      "We need to stop having retrospectives about the same problems and actually fix them.",
    ],
  },
];

export function buildSyntheticWorld(
  cloneId: string,
  rng: SeededRng
): SyntheticWorld {
  const basePeople: SyntheticPerson[] = [
    { id: "u_alex", name: "Alex Morgan", role: "VP Product", email: "alex@viven.io" },
    { id: "u_sarah", name: "Sarah Chen", role: "VP Sales", email: "sarah@viven.io" },
    { id: "u_jason", name: "Jason Park", role: "Engineering Lead", email: "jason@viven.io" },
    { id: "u_maria", name: "Maria Santos", role: "CTO", email: "maria@viven.io" },
    { id: "u_david", name: "David Kim", role: "VP Engineering", email: "david@viven.io" },
    { id: "u_priya", name: "Priya Sharma", role: "Finance Director", email: "priya@viven.io" },
    { id: "u_marcus", name: "Marcus Webb", role: "Customer Success Lead", email: "marcus@viven.io" },
  ];

  const projects: SyntheticProject[] = [
    {
      key: "ATLAS",
      name: "Atlas Security Rollout",
      repo: "viven/atlas-security",
      channel: "atlas-rollout",
      channel_id: "C_ATLAS",
      notion_page_id: "atlas-rollout-page",
      jira_board_id: "ATLAS-BOARD",
      gdrive_folder_id: "folder_atlas_security",
      target_date: "2026-03-15",
    },
    {
      key: "PULSE",
      name: "Pulse Analytics GA",
      repo: "viven/pulse-analytics",
      channel: "pulse-ga",
      channel_id: "C_PULSE",
      notion_page_id: "pulse-ga-plan",
      jira_board_id: "PULSE-BOARD",
      gdrive_folder_id: "folder_pulse_analytics",
      target_date: "2026-04-01",
    },
    {
      key: "NOVA",
      name: "Nova Onboarding Revamp",
      repo: "viven/nova-onboarding",
      channel: "nova-onboarding",
      channel_id: "C_NOVA",
      notion_page_id: "nova-onboarding-spec",
      jira_board_id: "NOVA-BOARD",
      gdrive_folder_id: "folder_nova_onboarding",
      target_date: "2026-03-01",
    },
  ];

  const rotatedPeople = [...basePeople];
  const rotation = rng.int(0, rotatedPeople.length - 1);
  for (let i = 0; i < rotation; i++) {
    const head = rotatedPeople.shift();
    if (head) rotatedPeople.push(head);
  }

  // Shuffle and pick a subset of conflicts for variety
  const shuffledConflicts = [...CONFLICTS].sort(() => rng.next() - 0.5);

  return {
    cloneId,
    people: rotatedPeople,
    projects,
    conflicts: shuffledConflicts,
  };
}
