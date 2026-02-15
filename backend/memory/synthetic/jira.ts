import type { MemoryResourceInput } from "@/lib/core/types";
import type { SyntheticProject, SyntheticWorld } from "./context";
import { randomIsoBetween, type SeededRng } from "./random";

interface JiraSourceMetadata extends Record<string, unknown> {
  source_type: "jira";
  board_id: string;
  issue_key: string;
  issue_type: string;
  assignee: string;
  reporter: string;
  priority: string;
  sprint: string;
}

interface JiraGeneratorParams {
  world: SyntheticWorld;
  rng: SeededRng;
  count: number;
  startIso: string;
  endIso: string;
}

function buildNormalTicket(
  project: SyntheticProject,
  rng: SeededRng,
  issueKey: string,
  assigneeName: string
): string {
  const types = [
    `[${issueKey}] Implement ${rng.pick(["SSO", "RBAC", "audit log", "rate limiter", "caching layer"])} for ${project.name}

Description:
As part of the ${project.key} initiative, we need to implement the ${rng.pick(["authentication", "authorization", "monitoring", "analytics"])} module.

Acceptance Criteria:
- All unit tests passing with >${rng.int(80, 95)}% coverage
- Performance benchmarks within SLA (p95 < ${rng.int(100, 200)}ms)
- Security review sign-off from ${rng.pick(["Maria Santos", "David Kim"])}
- Documentation updated

Assignee: ${assigneeName}
Story Points: ${rng.pick([3, 5, 8, 13])}
Sprint: Sprint ${rng.int(12, 18)}`,

    `[${issueKey}] Bug: ${rng.pick(["Memory leak", "Race condition", "Timeout", "Data inconsistency"])} in ${project.name}

Steps to Reproduce:
1. Deploy latest build to staging
2. Run load test with ${rng.int(50, 500)} concurrent users
3. Observe ${rng.pick(["memory growth", "failed requests", "stale data"])} after ${rng.int(10, 60)} minutes

Expected: System remains stable
Actual: ${rng.pick(["OOM kill after 2 hours", "5% error rate spike", "Database connections exhausted"])}

Priority: ${rng.pick(["High", "Critical"])}
Assignee: ${assigneeName}`,
  ];
  return rng.pick(types);
}

function buildSpicyTicket(
  project: SyntheticProject,
  world: SyntheticWorld,
  rng: SeededRng,
  issueKey: string,
  assigneeName: string,
  reporterName: string
): string {
  const conflict = rng.pick(world.conflicts);
  const otherPerson = rng.pick(world.people.filter(p => p.name !== assigneeName && p.name !== reporterName));

  const templates = [
    // Blame-shifting bug report
    `[${issueKey}] CRITICAL: Production outage caused by ${project.key} deployment

Reported by: ${reporterName}
Assigned to: ${assigneeName}

This is the ${rng.int(2, 4)}th production incident this month from the ${project.key} team.

Timeline:
- ${rng.int(2, 6)}:${rng.int(10, 59)}am: Deploy went out without proper QA sign-off
- ${rng.int(2, 6)}:${rng.int(10, 59)}am: Monitoring alerts fired (${rng.int(200, 5000)} affected users)
- ${rng.int(3, 7)}:${rng.int(10, 59)}am: On-call (${otherPerson.name}) woken up to fix it

Comment thread:
${reporterName}: "This should never have passed review. Who approved this?"
${assigneeName}: "${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}"
${reporterName}: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
${otherPerson.name}: "Can we focus on fixing it instead of blaming each other? I'd like to go back to sleep."

Root cause: Insufficient test coverage + skipped staging validation
Status: REOPENED (for the ${rng.int(2, 3)}rd time)`,

    // Contentious sprint planning
    `[${issueKey}] SPIKE: Evaluate whether to rewrite ${project.name} ${rng.pick(["auth module", "data pipeline", "API layer"])}

Reporter: ${reporterName}
Assignee: ${assigneeName}

Context:
${reporterName} is pushing for a full rewrite. ${assigneeName} disagrees.

Comments:
${reporterName}: "${conflict.side_a.position}"
${assigneeName}: "${conflict.side_b.position}"
${reporterName}: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
${otherPerson.name}: "This has been going back and forth for ${rng.int(3, 8)} sprints. Can leadership please make a call?"
${assigneeName}: "${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}"

Story Points: ${rng.pick([13, 21])} (disputed — ${reporterName} says 5, ${assigneeName} says 21)
Sprint: Backlog (nobody will pick it up voluntarily)
Labels: tech-debt, controversial, needs-leadership-decision`,

    // Passive-aggressive ticket reassignment
    `[${issueKey}] ${project.name}: Unblock ${rng.pick(["deployment", "security review", "data migration"])}

Reporter: ${reporterName}
Assignee: ${assigneeName} (reassigned from ${otherPerson.name}, who was reassigned from ${reporterName})

History:
This ticket has been reassigned ${rng.int(4, 7)} times in ${rng.int(2, 4)} weeks. Nobody wants to own it.

Comment thread:
${otherPerson.name}: "This isn't my team's responsibility. Moving to ${assigneeName}."
${assigneeName}: "${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
${reporterName}: "I originally filed this ${rng.int(3, 6)} weeks ago. ${conflict.passive_aggressive[rng.int(0, conflict.passive_aggressive.length - 1)]}"
${assigneeName}: "${conflict.heated_exchange[rng.int(0, conflict.heated_exchange.length - 1)]}"

Priority: Was Medium. Now Critical. Because we ignored it.
Due: ${project.target_date} (probably won't make it)`,
  ];

  return rng.pick(templates);
}

export function generateJiraResources({
  world,
  rng,
  count,
  startIso,
  endIso,
}: JiraGeneratorParams): MemoryResourceInput[] {
  const records: MemoryResourceInput[] = [];

  for (let i = 0; i < count; i++) {
    const project = rng.pick(world.projects);
    const assignee = rng.pick(world.people);
    const reporter = rng.pick(world.people.filter(p => p.id !== assignee.id));
    const issueNumber = rng.int(100, 999);
    const issueKey = `${project.key}-${issueNumber}`;
    const isSpicy = rng.bool(0.45);
    const occurredAt = randomIsoBetween(rng, startIso, endIso);
    const issueType = rng.pick(["Story", "Bug", "Task", "Spike", "Epic"]);
    const priority = isSpicy ? rng.pick(["Critical", "Blocker"]) : rng.pick(["Medium", "High", "Low"]);

    const content = isSpicy
      ? buildSpicyTicket(project, world, rng, issueKey, assignee.name, reporter.name)
      : buildNormalTicket(project, rng, issueKey, assignee.name);

    const metadata: JiraSourceMetadata = {
      source_type: "jira",
      board_id: project.jira_board_id,
      issue_key: issueKey,
      issue_type: issueType,
      assignee: assignee.name,
      reporter: reporter.name,
      priority,
      sprint: `Sprint ${rng.int(12, 18)}`,
    };

    records.push({
      clone_id: world.cloneId,
      source_type: "jira",
      external_id: `jira_${issueKey.toLowerCase()}`,
      title: `[${issueKey}] ${project.name} ${issueType}`,
      author: reporter.name,
      content,
      occurred_at: occurredAt,
      modality: "text",
      source_metadata: metadata,
      raw_payload: {
        issue_key: issueKey,
        board_id: project.jira_board_id,
        assignee: assignee.name,
        reporter: reporter.name,
        body: content,
      },
    });
  }

  return records.sort((a, b) =>
    a.occurred_at > b.occurred_at ? 1 : a.occurred_at < b.occurred_at ? -1 : 0
  );
}
