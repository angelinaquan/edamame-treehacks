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
  gdrive_folder_id: string;
  target_date: string;
  status: "abandoned" | "pivoted" | "active";
  phase: "early" | "mid" | "final";
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
    topic: "Ambient Listening AI vs pivoting",
    side_a: {
      position: "The ambient listening idea is way more novel. Always-on passive context capture is a real 0-to-1 product. We should stick with it.",
      person_role: "ambient-listener advocate",
    },
    side_b: {
      position: "The ambient thing needs iOS permissions, background audio, real-time transcription -- we can't build all that in 12 hours. We need to pivot.",
      person_role: "pragmatist",
    },
    passive_aggressive: [
      "I love how we're calling 'always spying on people' a feature. Very Silicon Valley.",
      "Sure, let's keep building something we can't demo. That'll go great with the judges.",
      "Glad we spent 3 hours on the ambient listening PRD just to throw it away.",
      "Per our last brainstorm, we already voted on this. But I guess we're voting again.",
      "I'm sure the privacy concerns will just sort themselves out in the next 9 hours.",
      "Another pivot. That's our second idea change tonight. Love the consistency.",
    ],
    heated_exchange: [
      "We have 12 hours to build this. The ambient listener needs iOS permissions, background audio, transcription -- do we even know how to do that?",
      "If we build the ambient listener and it's just a glorified note-taker, we're cooked. At least the other ideas have a clear demo path.",
      "Stop shooting down every idea. If you have a better one, pitch it instead of just saying no to everything.",
      "I'm not saying no, I'm saying let's be realistic about what 4 people can build overnight.",
      "We've been debating for two hours. That's two hours of building time gone.",
      "Fine, I'll build a prototype in the next hour. If it works, we keep it. If not, we pivot. Deal?",
    ],
  },
  {
    topic: "AI Workforce specialized agents vs simpler approach",
    side_a: {
      position: "Post-trained specialized agents is the real innovation. Each agent gets fine-tuned for a specific role -- that's a research contribution, not just another wrapper.",
      person_role: "specialized-agents advocate",
    },
    side_b: {
      position: "We don't have time to fine-tune anything. The judges need to see it WORK in a 3-minute demo. Can we even show specialization in 3 minutes?",
      person_role: "demo-focused pragmatist",
    },
    passive_aggressive: [
      "Cool, so we're building an 'AI workforce' where none of the agents actually do anything yet. Impressive.",
      "I'm sure the judges will love watching us explain fine-tuning theory for 3 minutes during the demo.",
      "We could also just submit a research paper instead of a hackathon project. Same energy.",
      "I wrote up the whole multi-agent architecture and nobody read it. Classic.",
      "Let's just pick something and commit. This back-and-forth is burning more time than the actual build.",
      "Adding that to the list of things we 'definitely have time for' at 3am.",
    ],
    heated_exchange: [
      "Neither the ambient listener NOR the workforce idea is demoable in 10 hours. We need something visual that a judge can understand in 30 seconds.",
      "If we can't explain it in one sentence, we've already lost. 'AI workforce with specialized agents' -- what does the DEMO look like?",
      "You're oversimplifying it. The multi-agent coordination is the novel part. Nobody is doing this well.",
      "Novel doesn't matter if we can't demo it. We have 8 hours left and no working prototype.",
      "I don't care which idea we go with at this point. I care that we ship SOMETHING.",
      "I stayed up building the agent framework and now we're pivoting? Are you serious?",
    ],
  },
  {
    topic: "Scope and time management -- committing to memory layer",
    side_a: {
      position: "We need to cut scope NOW. AI-native memory layer is the idea -- let's lock it and build. No more features, no more debates.",
      person_role: "scope-cutter",
    },
    side_b: {
      position: "If we cut too much, OrgPulse won't be impressive enough. We need the full vision -- onboarding, offboarding, memory explorer, clone chat.",
      person_role: "maximalist",
    },
    passive_aggressive: [
      "Oh cool, we added another feature. I'm sure we'll sleep at some point.",
      "I love that our MVP has 8 features. Very 'minimum' of us.",
      "Should I keep coding or should I wait for the scope to change again in 20 minutes?",
      "Friendly reminder that we have 6 hours left and the demo doesn't work yet.",
      "I'm sure the judges will appreciate our ambition when nothing loads during the presentation.",
      "Adding that to the list of things we 'definitely have time for' at 4am.",
    ],
    heated_exchange: [
      "The demo is in 6 hours and we don't have a working prototype. Does anyone else think that's a problem?",
      "If one more person suggests adding a feature, I'm going to lose it. We can barely get the core working.",
      "Look, I get that we all have opinions. But we committed to the memory layer idea 3 hours ago. Let's finish it.",
      "We've pivoted TWICE tonight. If we pivot again we'll have nothing to show. Zero. Is that what we want?",
      "I've been coding since 10pm and it's now 4am. Can we please just build the thing we agreed on?",
      "Someone just make a decision and we all commit. I'm too tired to keep debating.",
    ],
  },
];

export function buildSyntheticWorld(
  cloneId: string,
  rng: SeededRng
): SyntheticWorld {
  const basePeople: SyntheticPerson[] = [
    { id: "u_james", name: "James Liu", role: "ML Engineer", email: "james@treehacks.team" },
    { id: "u_ella", name: "Ella Lan", role: "Full-Stack Engineer", email: "ella@treehacks.team" },
    { id: "u_angelina", name: "Angelina Quan", role: "Product & Frontend", email: "angelina@treehacks.team" },
    { id: "u_videet", name: "Videet Mehta", role: "Backend & Infra", email: "videet@treehacks.team" },
  ];

  const projects: SyntheticProject[] = [
    {
      key: "AMBIENT",
      name: "Ambient Listening AI",
      repo: "treehacks-team/ambient-listener",
      channel: "treehacks-general",
      channel_id: "C_TREEHACKS",
      gdrive_folder_id: "folder_ambient_ai",
      target_date: "2026-02-15 9:30 AM PT",
      status: "abandoned",
      phase: "early",
    },
    {
      key: "WORKFORCE",
      name: "AI Workforce - Specialized Agents",
      repo: "treehacks-team/ai-workforce",
      channel: "treehacks-general",
      channel_id: "C_TREEHACKS",
      gdrive_folder_id: "folder_ai_workforce",
      target_date: "2026-02-15 9:30 AM PT",
      status: "pivoted",
      phase: "mid",
    },
    {
      key: "MEMLAYER",
      name: "OrgPulse - AI-Native Memory Layer",
      repo: "treehacks-team/orgpulse",
      channel: "treehacks-general",
      channel_id: "C_TREEHACKS",
      gdrive_folder_id: "folder_orgpulse",
      target_date: "2026-02-15 9:30 AM PT",
      status: "active",
      phase: "final",
    },
  ];

  const rotatedPeople = [...basePeople];
  const rotation = rng.int(0, rotatedPeople.length - 1);
  for (let i = 0; i < rotation; i++) {
    const head = rotatedPeople.shift();
    if (head) rotatedPeople.push(head);
  }

  const shuffledConflicts = [...CONFLICTS].sort(() => rng.next() - 0.5);

  return {
    cloneId,
    people: rotatedPeople,
    projects,
    conflicts: shuffledConflicts,
  };
}
