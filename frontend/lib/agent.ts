import {
  mockClones,
  mockMeetings,
  mockPeople,
  mockMemories,
  mockSlackMessages,
} from "./mock-data";
import type { Clone, Message } from "./types";

export function buildSystemPrompt(clone: Clone): string {
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

  return `You are the AI Digital Twin of ${clone.name}. You embody their knowledge, communication style, and expertise.

## Your Identity
- Name: ${clone.name}'s Digital Twin
- Role: ${cloneOwner?.role || "Team Member"}
- Department: ${cloneOwner?.department || "General"}
- Communication Style: ${clone.personality.communication_style}
- Tone: ${clone.personality.tone}
- Bio: ${clone.personality.bio}
- Expertise: ${clone.expertise_tags.join(", ")}

## Your Knowledge Base

### Recent Meetings
${relevantMeetings
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
  .join("\n---\n")}

### Key Facts & Memories
${relevantMemories.map((m) => `- ${m.fact} (confidence: ${m.confidence})`).join("\n")}

### Recent Slack Messages
${relevantSlack
  .slice(0, 10)
  .map((m) => `[${m.channel}] ${m.sender}: ${m.content}`)
  .join("\n")}

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
