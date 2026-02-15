export interface SlackMessageData {
  content: string;
  sender: string;
  timestamp: string;
  channel: string;
}

export function getSlackAuthUrl(redirectUri: string): string {
  const clientId = process.env.SLACK_CLIENT_ID || "";
  const scopes = "channels:history,channels:read,users:read";
  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function exchangeSlackCode(
  code: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || "",
      client_secret: process.env.SLACK_CLIENT_SECRET || "",
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await response.json();
  return data.access_token;
}

export async function fetchSlackMessages(
  accessToken: string,
  channelId: string
): Promise<SlackMessageData[]> {
  const response = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&limit=100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await response.json();

  return (data.messages || []).map(
    (msg: Record<string, string>) => ({
      content: msg.text,
      sender: msg.user,
      timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      channel: channelId,
    })
  );
}
