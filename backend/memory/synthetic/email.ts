import type { MemoryResourceInput } from "@/lib/core/types";
import type { SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface EmailSourceMetadata extends Record<string, unknown> {
  source_type: "email";
  message_id: string;
  thread_id: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
}

interface EmailGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildNormalEmail(
  project: SyntheticProject,
  from: string,
  to: string,
  rng: SeededRng
): { subject: string; body: string } {
  const templates = [
    {
      subject: `${project.name} - Weekly Update`,
      body: `Hi ${to.split("@")[0]},

Quick update on ${project.key}:

- Sprint velocity: ${rng.int(25, 40)} points completed
- On track for ${project.target_date} delivery
- No major blockers this week
- Design review scheduled for next Tuesday

Let me know if you have questions.

Best,
${from.split("@")[0]}`,
    },
    {
      subject: `Re: ${project.name} Timeline Check`,
      body: `Hi ${to.split("@")[0]},

To confirm — we're good on the ${project.target_date} date. The team completed the milestone deliverables ahead of schedule.

Remaining items:
- Final security audit (in progress)
- Documentation updates (assigned)
- Staging deployment (scheduled for Friday)

Thanks,
${from.split("@")[0]}`,
    },
  ];
  return rng.pick(templates);
}

function buildSpicyEmail(
  project: SyntheticProject,
  world: SyntheticWorld,
  fromPerson: { name: string; email: string },
  toPerson: { name: string; email: string },
  rng: SeededRng
): { subject: string; body: string; cc: string[] } {
  const conflict = rng.pick(world.conflicts);
  const ccPeople = world.people
    .filter(p => p.id !== fromPerson.email && p.email !== toPerson.email)
    .slice(0, rng.int(2, 5))
    .map(p => p.email);
  const boss = rng.pick(world.people.filter(p => p.role.includes("VP") || p.role.includes("CTO")));

  const templates = [
    // CC-the-boss escalation
    {
      subject: `ESCALATION: ${project.name} - ${conflict.topic}`,
      body: `${toPerson.name},

I'm escalating this since we haven't been able to resolve it directly.

${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}

For context, I've raised this issue in:
- Slack (#${project.channel}) on ${rng.int(3, 6)} occasions
- Our 1:1 last Tuesday
- The team sync on Monday
- The sprint retro two weeks ago

Each time, the response has been some variation of "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"

I'm copying ${boss.name} because we need a decision from leadership. This can't keep going in circles.

${fromPerson.name}`,
      cc: [boss.email, ...ccPeople],
    },

    // Reply-all storm
    {
      subject: `Re: Re: Re: Re: ${project.name} Ownership (PLEASE READ)`,
      body: `All,

I want to be crystal clear since this email thread has ${rng.int(15, 30)} replies and no resolution:

${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}

To summarize the ${rng.int(3, 5)} different positions in this thread:
- ${fromPerson.name}: ${conflict.side_a.position}
- ${toPerson.name}: ${conflict.side_b.position}
- Everyone else: "Can we take this offline?" (We did. Twice. It didn't help.)

${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

I'm proposing we make a decision in tomorrow's meeting and MOVE ON. If we can't decide in 30 minutes, I'm going with Option A and anyone who disagrees can file a formal objection.

${fromPerson.name}

P.S. Please stop replying all to this thread. My inbox can't take it.`,
      cc: ccPeople,
    },

    // "Per my last email" classic
    {
      subject: `Re: ${project.name} - Action Items (Following up AGAIN)`,
      body: `${toPerson.name},

Per my last ${rng.int(2, 4)} emails, the action items from the ${project.key} review are still outstanding:

1. ${rng.pick(["Security sign-off", "Budget approval", "Stakeholder alignment"])} — was due ${rng.int(5, 14)} days ago
2. ${rng.pick(["Resource plan", "Risk assessment", "Timeline update"])} — no update provided
3. ${rng.pick(["Test results", "Performance benchmarks", "Compliance checklist"])} — "in progress" since ${rng.int(2, 4)} weeks ago

${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

I need these completed by EOD Friday or I'll need to flag this to ${boss.name} as a blocker for the ${project.target_date} launch.

${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}

Thanks,
${fromPerson.name}`,
      cc: [boss.email],
    },

    // Deadline ultimatum
    {
      subject: `${project.name} - Final Notice: ${project.target_date} Deadline`,
      body: `Team,

I'll be direct: we are ${rng.int(2, 5)} weeks behind on ${project.key} and the ${project.target_date} date is non-negotiable.

${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}

Here's what needs to happen:
- All non-critical work stops immediately
- Daily standups until launch (yes, daily — I know nobody likes them)
- Weekend work may be required (I'll buy pizza, for what that's worth)

${toPerson.name} — I need your team's capacity plan by tomorrow morning.

If anyone has concerns, my door is open. But the deadline isn't moving.

${fromPerson.name}`,
      cc: ccPeople,
    },
  ];

  return rng.pick(templates);
}

export function generateEmailResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: EmailGeneratorParams): MemoryResourceInput[] {
  const records: MemoryResourceInput[] = [];

  for (let i = 0; i < count; i++) {
    const project = rng.pick(world.projects);
    const fromPerson = rng.pick(world.people);
    const toPerson = rng.pick(world.people.filter(p => p.id !== fromPerson.id));
    const isSpicy = rng.bool(0.45);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const messageId = `msg_${project.key.toLowerCase()}_${i + 1}_${rng.int(10000, 99999)}`;
    const threadId = `thread_${project.key.toLowerCase()}_${rng.int(100, 999)}`;

    let subject: string;
    let body: string;
    let cc: string[] = [];

    if (isSpicy) {
      const spicy = buildSpicyEmail(project, world, fromPerson, toPerson, rng);
      subject = spicy.subject;
      body = spicy.body;
      cc = spicy.cc;
    } else {
      const normal = buildNormalEmail(project, fromPerson.email, toPerson.email, rng);
      subject = normal.subject;
      body = normal.body;
    }

    const metadata: EmailSourceMetadata = {
      source_type: "email",
      message_id: messageId,
      thread_id: threadId,
      from: fromPerson.email,
      to: [toPerson.email],
      cc,
      subject,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "email",
      external_id: messageId,
      title: subject,
      author: fromPerson.name,
      content: body,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        message_id: messageId,
        thread_id: threadId,
        from: fromPerson.email,
        to: [toPerson.email],
        cc,
        subject,
        body,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
