"""Modal app configuration for AI Clone Platform."""
import modal

app = modal.App("ai-clone-platform")

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "anthropic",
    "openai",
    "numpy",
)
