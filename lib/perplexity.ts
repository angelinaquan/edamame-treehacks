export async function searchWeb(
  query: string
): Promise<{ answer: string; sources: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    return {
      answer: `Web search is not configured. Here's what I know from my training data about "${query}".`,
      sources: [],
    };
  }

  try {
    const response = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful research assistant. Provide concise, factual answers.",
            },
            { role: "user", content: query },
          ],
        }),
      }
    );

    const data = await response.json();
    return {
      answer: data.choices?.[0]?.message?.content || "No results found.",
      sources: data.citations || [],
    };
  } catch {
    return {
      answer: "Web search temporarily unavailable.",
      sources: [],
    };
  }
}
