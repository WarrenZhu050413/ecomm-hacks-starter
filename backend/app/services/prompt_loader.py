"""Load and fill prompt templates."""

from pathlib import Path
from typing import Any

# Cache loaded prompts
_prompt_cache: dict[str, str] = {}


def load_prompt(name: str) -> str:
    """Load a prompt template from the prompts directory.

    Args:
        name: Name of the prompt file (without .md extension)

    Returns:
        The prompt template text
    """
    if name in _prompt_cache:
        return _prompt_cache[name]

    prompts_dir = Path(__file__).parent.parent.parent / "prompts"
    prompt_path = prompts_dir / f"{name}.md"

    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt template not found: {prompt_path}")

    with open(prompt_path) as f:
        template = f.read()

    _prompt_cache[name] = template
    return template


def load_and_fill_prompt(name: str, **kwargs: Any) -> str:
    """Load a prompt template and fill in variables.

    Args:
        name: Name of the prompt file (without .md extension)
        **kwargs: Variables to substitute in the template

    Returns:
        The filled prompt text
    """
    template = load_prompt(name)

    # Simple variable substitution using {variable_name} format
    for key, value in kwargs.items():
        placeholder = f"{{{key}}}"
        if placeholder in template:
            template = template.replace(placeholder, str(value) if value is not None else "")

    return template


def format_history(messages: list[dict[str, str]]) -> str:
    """Format conversation history into a string.

    Args:
        messages: List of {"role": "user"|"assistant", "content": str}

    Returns:
        Formatted string like "User: message\nAssistant: response\n"
    """
    lines = []
    for msg in messages:
        role = msg.get("role", "user").capitalize()
        content = msg.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)
