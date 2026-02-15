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
    topic: "Ambient Listening AI vs Healthcare Agent",
    side_a: { position: "The ambient listening idea is way more novel. Always-on passive context capture is a real 0-to-1 product. Healthcare is played out at hackathons.", person_role: "ambient-listener advocate" },
    side_b: { position: "Healthcare has real impact and clear use cases. The ambient thing is creepy and nobody will want their phone always listening.", person_role: "healthcare advocate" },
    passive_aggressive: [
      "Sure, let's build another healthcare chatbot. I'm sure the judges have never seen one of those before.",
      "I love how we're calling 'always spying on people' a feature. Very Silicon Valley.",
      "Per our last brainstorm, we already voted on this. But I guess we're voting again.",
      "Great, another pivot. That's our fourth idea change this week.",
      "I'm sure the privacy concerns will just sort themselves out.",
      "Glad we spent 3 hours on the ambient listening PRD just to throw it away.",
    ],
    heated_exchange: [
      "We have 36 hours to build this. Healthcare agents need real medical data and compliance. We don't have time.",
      "If we build the ambient listener and it's just a glorified note-taker, we're cooked. At least healthcare has a clear demo path.",
      "I've seen 15 healthcare hackathon projects. They all look the same. We need to stand out.",
      "Standing out doesn't matter if we can't demo it. An always-listening app needs iOS permissions, background audio, transcription — do we even know how to do that?",
      "Stop shooting down every idea. If you have a better one, pitch it instead of just saying no to everything.",
      "I'm not saying no, I'm saying let's be realistic about what we can build in a weekend.",
    ],
  },
  {
    topic: "RL Self-Improvement Loop vs Plug-and-Play RL",
    side_a: { position: "The self-improvement loop is more impressive technically. Generate, critique, improve — that's a real research contribution.", person_role: "self-improvement advocate" },
    side_b: { position: "The plug-and-play RL framework is more useful. 'npm for RL environments' — that's a product people would actually use.", person_role: "rl-framework advocate" },
    passive_aggressive: [
      "Cool, so we're building a framework that nobody will use because RL researchers already have their own setups.",
      "I'm sure the judges will love watching a model slowly improve its own output for 3 minutes during the demo.",
      "We could also just submit a research paper instead of a hackathon project. Same energy.",
      "Ah yes, 'Docker for specialization.' Because what the world needs is more infrastructure projects.",
      "I wrote up the whole self-improvement architecture and nobody read it. Classic.",
      "Let's just pick something and commit. This back-and-forth is burning more time than the actual build.",
    ],
    heated_exchange: [
      "Neither of these are demoable in 36 hours. We need something visual. Something a judge can understand in 30 seconds.",
      "If we can't explain it in one sentence, we've already lost. 'AI that improves itself' sounds cool but what does the demo look like?",
      "At least the RL framework has a clear interface. The self-improvement thing is just a loop that runs in a terminal.",
      "You're oversimplifying it. The critique step is the novel part. No one is doing structured self-critique well.",
      "We're going in circles. Someone just make a decision.",
      "Fine, I'll build a prototype tonight. If it works, we go with it. If not, we pivot. Deal?",
    ],
  },
  {
    topic: "Scope creep and time management",
    side_a: { position: "We need to cut scope NOW. We're trying to build too much and we'll end up with nothing working.", person_role: "pragmatist" },
    side_b: { position: "If we cut too much, the project won't be impressive enough to win. We need the full vision.", person_role: "maximalist" },
    passive_aggressive: [
      "Oh cool, we added another feature. I'm sure we'll sleep at some point.",
      "I love that our MVP has 12 features. Very 'minimum' of us.",
      "Should I keep coding or should I wait for the scope to change again in 20 minutes?",
      "Friendly reminder that we have 18 hours left and the demo doesn't work yet.",
      "I'm sure the judges will appreciate our ambition when nothing loads during the presentation.",
      "Adding that to the list of things we 'definitely have time for.'",
    ],
    heated_exchange: [
      "We've been debating for two hours. That's two hours of building time gone. Can we please just pick something?",
      "I don't care which idea we go with at this point. I care that we ship SOMETHING.",
      "If one more person suggests adding a feature, I'm going to lose it. We can barely get the core working.",
      "The demo is in 18 hours and we don't have a working prototype. Does anyone else think that's a problem?",
      "I stayed up until 4am building the backend and now we're pivoting? Are you serious?",
      "Look, I get that we all have opinions. But we committed to this idea yesterday. Let's finish it.",
    ],
  },
  {
    topic: "Fact-checking agent viability",
    side_a: { position: "Fact-checking with AI is actually useful. Think about all the misinformation on X. We could build a browser extension.", person_role: "fact-check advocate" },
    side_b: { position: "Grok already does this. And fact-checking AI is just... another LLM wrapper. The judges will see through it.", person_role: "fact-check skeptic" },
    passive_aggressive: [
      "So our innovation is... asking GPT if something is true? Groundbreaking.",
      "I'm sure @grok won't mind us copying their homework.",
      "We could just ship a Chrome extension that says 'maybe' on every tweet. Same accuracy.",
      "The fact-checking idea is great if we want to come in last place.",
      "I wrote a whole architecture doc for this and now we're fading it. Love that for me.",
      "Fine, let's not do fact-checking. Let's also not do the other 6 ideas we've rejected today.",
    ],
    heated_exchange: [
      "Stop comparing everything to existing products. By that logic, nothing is worth building.",
      "I'm not saying don't build it. I'm saying the judges will ask 'how is this different from Grok' and we won't have an answer.",
      "The difference is we'd do it for research papers and Wikipedia, not just tweets. That's actually novel.",
      "Novel doesn't mean good. We have 36 hours. Can we build a reliable fact-checker in 36 hours? No.",
      "You've shot down literally every idea today. What do YOU want to build?",
      "Something that works! That's what I want to build! Something that actually functions during the demo!",
    ],
  },
  {
    topic: "AI Ads idea",
    side_a: { position: "AI-generated ads from the user's perspective is actually a clever angle. Personalized ad generation could be huge.", person_role: "ads advocate" },
    side_b: { position: "Nobody at a hackathon wants to see an ads product. Judges want to see something that helps people, not sells to them.", person_role: "ads skeptic" },
    passive_aggressive: [
      "Yes, let's build an ad generator at a hackathon themed around 'human flourishing.' Perfect alignment.",
      "I'm sure 'more effective advertising' is what the world needs right now.",
      "We could pivot to 'AI that blocks ads' and it would be more popular than 'AI that makes ads.'",
      "The ads idea is technically interesting but morally questionable. So, very Silicon Valley.",
      "If we build this, can we at least not put it on our resumes?",
    ],
    heated_exchange: [
      "You're all so idealistic. Ads fund the entire internet. Making them better IS helping people.",
      "The hackathon theme is literally 'human flourishing.' How do ads make humans flourish?",
      "Fine, forget the ads idea. But we need to stop rejecting everything and start building.",
      "I'd rather build something I'm proud of than something that 'could make money.'",
      "We've been going back and forth for 4 hours. At this rate our hackathon project is a Google Doc full of rejected ideas.",
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
      channel: "ambient-ai",
      channel_id: "C_AMBIENT",
      notion_page_id: "ambient-listener-prd",
      jira_board_id: "AMBIENT-BOARD",
      gdrive_folder_id: "folder_ambient_ai",
      target_date: "2026-02-15 9:30 AM PT",
    },
    {
      key: "HEALTH",
      name: "Healthcare Voice Agent",
      repo: "treehacks-team/health-voice-agent",
      channel: "health-agent",
      channel_id: "C_HEALTH",
      notion_page_id: "health-agent-spec",
      jira_board_id: "HEALTH-BOARD",
      gdrive_folder_id: "folder_health_agent",
      target_date: "2026-02-15 9:30 AM PT",
    },
    {
      key: "SELFIMP",
      name: "Self-Improvement Loop AI",
      repo: "treehacks-team/self-improve",
      channel: "self-improvement",
      channel_id: "C_SELFIMP",
      notion_page_id: "self-improve-rfc",
      jira_board_id: "SELFIMP-BOARD",
      gdrive_folder_id: "folder_self_improve",
      target_date: "2026-02-15 9:30 AM PT",
    },
    {
      key: "RLENV",
      name: "Plug-and-Play RL Framework",
      repo: "treehacks-team/rl-environments",
      channel: "rl-framework",
      channel_id: "C_RLENV",
      notion_page_id: "rl-framework-plan",
      jira_board_id: "RLENV-BOARD",
      gdrive_folder_id: "folder_rl_framework",
      target_date: "2026-02-15 9:30 AM PT",
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
