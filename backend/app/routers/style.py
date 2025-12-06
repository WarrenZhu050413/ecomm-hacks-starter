"""Style router - Chat-based visual style modifications."""

import logging

from fastapi import APIRouter, HTTPException, Request

from app.models.canvas_config import load_defaults
from app.models.ephemeral import StyleRequest, StyleResponse
from app.services.prompt_loader import load_and_fill_prompt, format_history
from app.services.session_store import session_store
from app.services.xml_parser import parse_style_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ephemeral"])

# Model mapping - using latest Gemini 3 Pro models
MODEL_MAP = {
    "pro": "gemini-3-pro-preview",
    "flash": "gemini-3-pro-preview",  # Use pro for everything
    "flash-thinking": "gemini-3-pro-preview",
}


def _theme_to_string(theme: dict) -> str:
    """Convert a theme dict to a readable string for the prompt."""
    lines = []
    for key, value in theme.items():
        if value is not None:
            lines.append(f"  {key}: {repr(value)}")
    return "{\n" + ",\n".join(lines) + "\n}"


@router.post("/style")
async def style_chat(request_data: StyleRequest, request: Request) -> StyleResponse:
    """Handle style chat - modify visual themes via natural language.

    Takes current theme/physics + user message, returns partial updates.
    Model is determined by defaults.models.chat.
    """
    try:
        gemini = request.app.state.gemini_service
        if not gemini:
            raise HTTPException(status_code=503, detail="Gemini service not initialized")

        # Get or create session for conversation continuity
        session_id, history = await session_store.get_or_create(
            request_data.session_id
        )

        # Load defaults for model selection
        defaults = load_defaults()
        chat_model = defaults.get("models", {}).get("chat", "flash")
        gemini_model = MODEL_MAP.get(chat_model, "gemini-2.5-flash")

        # Format current config for the prompt
        card_theme_str = _theme_to_string(request_data.current_card_theme.model_dump())
        canvas_theme_str = _theme_to_string(request_data.current_canvas_theme.model_dump())
        physics_str = _theme_to_string(request_data.current_physics.model_dump())

        # Load and fill the prompt template
        prompt = load_and_fill_prompt(
            "style",
            current_card_theme=card_theme_str,
            current_canvas_theme=canvas_theme_str,
            current_physics=physics_str,
            conversation_history=format_history(history),
            user_message=request_data.message,
        )

        # Query Gemini
        result = await gemini.query(prompt, model=gemini_model)
        response = result.text

        # Parse the response
        parsed = parse_style_response(response)

        # Store messages in session
        await session_store.add_message(session_id, "user", request_data.message)
        explanation = parsed.get("explanation", "")
        await session_store.add_message(session_id, "assistant", explanation)

        # Build response
        return StyleResponse(
            type=parsed["type"],
            card_theme=parsed.get("card_theme"),
            canvas_theme=parsed.get("canvas_theme"),
            physics=parsed.get("physics"),
            explanation=explanation,
            session_id=session_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Style chat error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"Style chat error: {str(e)}")
