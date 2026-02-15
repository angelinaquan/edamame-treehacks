"""Generate text embeddings for vector search."""
import os


def generate_embedding(text):
    import openai
    client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    response = client.embeddings.create(model="text-embedding-3-small", input=text)
    if isinstance(text, str):
        return response.data[0].embedding
    return [item.embedding for item in response.data]
