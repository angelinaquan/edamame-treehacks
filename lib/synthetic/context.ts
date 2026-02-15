import type { SeededRng } from "./random";

export interface SyntheticPerson {
  id: string;
  name: string;
  role: string;
}

export interface SyntheticProject {
  key: string;
  name: string;
  repo: string;
  channel: string;
  channel_id: string;
  notion_page_id: string;
  target_date: string;
}

export interface SyntheticWorld {
  cloneId: string;
  people: SyntheticPerson[];
  projects: SyntheticProject[];
}

export function buildSyntheticWorld(
  cloneId: string,
  rng: SeededRng
): SyntheticWorld {
  const basePeople: SyntheticPerson[] = [
    { id: "u_alex", name: "Alex Morgan", role: "VP Product" },
    { id: "u_sarah", name: "Sarah Chen", role: "VP Sales" },
    { id: "u_jason", name: "Jason Park", role: "Engineering Lead" },
    { id: "u_maria", name: "Maria Santos", role: "CTO" },
    { id: "u_david", name: "David Kim", role: "VP Engineering" },
  ];

  const projects: SyntheticProject[] = [
    {
      key: "ATLAS",
      name: "Atlas Security Rollout",
      repo: "viven/atlas-security",
      channel: "atlas-rollout",
      channel_id: "C_ATLAS",
      notion_page_id: "atlas-rollout-page",
      target_date: "2026-03-15",
    },
    {
      key: "PULSE",
      name: "Pulse Analytics GA",
      repo: "viven/pulse-analytics",
      channel: "pulse-ga",
      channel_id: "C_PULSE",
      notion_page_id: "pulse-ga-plan",
      target_date: "2026-04-01",
    },
    {
      key: "NOVA",
      name: "Nova Onboarding Revamp",
      repo: "viven/nova-onboarding",
      channel: "nova-onboarding",
      channel_id: "C_NOVA",
      notion_page_id: "nova-onboarding-spec",
      target_date: "2026-03-01",
    },
  ];

  // Shift people order per seed for slightly different yet deterministic voice.
  const rotatedPeople = [...basePeople];
  const rotation = rng.int(0, rotatedPeople.length - 1);
  for (let i = 0; i < rotation; i++) {
    const head = rotatedPeople.shift();
    if (head) rotatedPeople.push(head);
  }

  return {
    cloneId,
    people: rotatedPeople,
    projects,
  };
}
