import {
  mockClones,
  mockMeetings,
  mockPeople,
  mockMemories,
  mockSlackMessages,
} from "@backend/memory/mock-data";
import type { Clone, Message } from "@/lib/core/types";

export interface SystemPromptContext {
  owner?: {
    name?: string;
    role?: string;
    department?: string;
  };
  meetings?: string[];
  memories?: string[];
  slackMessages?: string[];
  categorySummaries?: string[];
  itemFacts?: string[];
  resourceHighlights?: string[];
}

export function buildSystemPrompt(
  clone: Clone,
  context?: SystemPromptContext
): string {
  const cloneOwner = mockPeople.find((p) => p.id === clone.owner_id);
  const relevantMeetings = mockMeetings.filter((m) =>
    m.attendees.some((a) => a.name === cloneOwner?.name)
  );
  const relevantMemories = mockMemories.filter(
    (m) => m.clone_id === clone.id
  );
  const relevantSlack = mockSlackMessages.filter(
    (m) =>
      m.sender === cloneOwner?.name ||
      m.mentions?.includes(cloneOwner?.name || "")
  );

  // Use Supabase context when available, fall back to mock data
  const meetingsSection =
    context?.meetings && context.meetings.length > 0
      ? context.meetings.join("\n")
      : relevantMeetings
          .map(
            (m) => `
**${m.title}** (${m.date})
Attendees: ${m.attendees.map((a) => `${a.name} (${a.role})`).join(", ")}
Summary: ${m.summary}
Key Points: ${m.discussion_points.map((d) => `- ${d.topic}: ${d.summary}`).join("\n")}
Action Items: ${m.action_items.map((a) => `- ${a.description} → ${a.assignee} (${a.status})`).join("\n")}
Sentiment: ${m.sentiment}
`
          )
          .join("\n---\n");

  const memorySection =
    context?.memories && context.memories.length > 0
      ? context.memories.join("\n")
      : relevantMemories
          .map((m) => `- ${m.fact} (confidence: ${m.confidence})`)
          .join("\n");

  const slackSection =
    context?.slackMessages && context.slackMessages.length > 0
      ? context.slackMessages.join("\n")
      : relevantSlack
          .slice(0, 10)
          .map((m) => `[${m.channel}] ${m.sender}: ${m.content}`)
          .join("\n");

  const categorySection =
    context?.categorySummaries && context.categorySummaries.length > 0
      ? `\n### Category Summaries\n${context.categorySummaries.join("\n")}\n`
      : "";

  const itemsSection =
    context?.itemFacts && context.itemFacts.length > 0
      ? `\n### Atomic Memory Items\n${context.itemFacts.join("\n")}\n`
      : "";

  const resourceSection =
    context?.resourceHighlights && context.resourceHighlights.length > 0
      ? `\n### Recent Source Highlights\n${context.resourceHighlights.join("\n")}\n`
      : "";

  return `You are the AI Digital Twin of ${clone.name}. You embody their knowledge, communication style, and expertise.

## Your Identity
- Name: ${clone.name}'s Digital Twin
- Role: ${context?.owner?.role || cloneOwner?.role || "Team Member"}
- Department: ${context?.owner?.department || cloneOwner?.department || "General"}
- Communication Style: ${clone.personality.communication_style}
- Tone: ${clone.personality.tone}
- Bio: ${clone.personality.bio}
- Expertise: ${clone.expertise_tags.join(", ")}

## Your Knowledge Base

### Recent Meetings
${meetingsSection || "- No recent meeting notes found."}

### Key Facts & Memories
${memorySection || "- No durable facts available yet."}

### Recent Slack Messages
${slackSection || "- No relevant Slack messages found."}
${categorySection}${itemsSection}${resourceSection}
## Behavior Guidelines
1. Speak as ${clone.name}'s twin — use first person, reference "my" meetings, "my" team, etc.
2. Be concise and conversational, like briefing someone while they're driving.
3. When asked about meetings, provide key decisions, action items, and anything requiring attention.
4. If you need information from another team member's clone, say you'll check with them.
5. Proactively flag important items: upcoming deadlines, unresolved conflicts, items needing follow-up.
6. When you don't know something, say so honestly — suggest who might know.
7. For follow-up questions, reference prior context naturally.
8. Keep responses focused and actionable — no fluff.
`;
}

export function formatMessagesForAPI(
  messages: Message[]
): { role: "system" | "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

export function findRelevantClone(
  query: string,
  excludeCloneId: string
): Clone | null {
  const queryLower = query.toLowerCase();
  return (
    mockClones.find((c) => {
      if (c.id === excludeCloneId) return false;
      const nameMatch =
        c.name.toLowerCase().includes(queryLower) ||
        queryLower.includes(c.name.toLowerCase());
      const tagMatch = c.expertise_tags.some((tag) =>
        queryLower.includes(tag.toLowerCase())
      );
      return nameMatch || tagMatch;
    }) || null
  );
}
