"""Clone brain - the AI agent that powers each clone's reasoning."""
import json
import os


def run_clone(
    clone_id: str,
    message: str,
    system_prompt: str,
    conversation_history: list,
    available_tools: list | None = None,
) -> dict:
    """Run a clone's brain to generate a response."""
    import openai

    client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": message})

    tools = [
        {
            "type": "function",
            "function": {
                "name": "search_knowledge_base",
                "description": "Search through documents and memories for relevant info",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query"}
                    },
                    "required": ["query"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "consult_clone",
                "description": "Ask another team member's clone for information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "clone_name": {"type": "string", "description": "Name of clone"},
                        "question": {"type": "string", "description": "Question to ask"},
                    },
                    "required": ["clone_name", "question"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "remember_fact",
                "description": "Save an important fact from this conversation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "fact": {"type": "string", "description": "The fact to remember"}
                    },
                    "required": ["fact"],
                },
            },
        },
    ]

    reasoning_steps = []
    tool_calls_made = []

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
            temperature=0.7,
            max_tokens=2048,
        )

        choice = response.choices[0]

        if choice.message.tool_calls:
            for tool_call in choice.message.tool_calls:
                reasoning_steps.append(f"Using tool: {tool_call.function.name}")
                tool_calls_made.append(
                    {
                        "name": tool_call.function.name,
                        "arguments": json.loads(tool_call.function.arguments),
                    }
                )

        return {
            "response": choice.message.content or "",
            "reasoning": reasoning_steps,
            "tool_calls": tool_calls_made,
        }
    except Exception as e:
        return {
            "response": f"I encountered an issue: {str(e)}",
            "reasoning": [f"Error: {str(e)}"],
            "tool_calls": [],
        }
