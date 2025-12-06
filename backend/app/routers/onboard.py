"""Onboard router - Q&A conversation to generate CanvasConfig."""

import logging

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)

from app.models.canvas_config import load_defaults
from app.models.ephemeral import OnboardRequest, OnboardResponse
from app.services.prompt_loader import load_and_fill_prompt, format_history
from app.services.session_store import session_store
from app.services.xml_parser import parse_onboard_response

router = APIRouter(prefix="/api", tags=["ephemeral"])

# Model mapping - using latest Gemini 3 Pro models
MODEL_MAP = {
    "pro": "gemini-3-pro-preview",
    "flash": "gemini-3-pro-preview",  # Use pro for everything
    "flash-thinking": "gemini-3-pro-preview",
}


@router.post("/onboard")
async def onboard(request_data: OnboardRequest, request: Request) -> OnboardResponse:
    """Handle onboarding Q&A conversation.

    Returns either a follow-up question or a complete CanvasConfig.
    Session is managed server-side - client just needs to pass session_id.

    Model is determined by defaults.models.onboarding (or current config if editing).
    """
    try:
        gemini = request.app.state.gemini_service
        if not gemini:
            raise HTTPException(status_code=503, detail="Gemini service not initialized")

        # Get or create session
        session_id, history = await session_store.get_or_create(request_data.session_id)

        # Load defaults for model selection
        defaults = load_defaults()
        onboarding_model = defaults.get("models", {}).get("onboarding", "pro")
        gemini_model = MODEL_MAP.get(onboarding_model, "gemini-2.5-pro")

        # Load and fill the prompt template
        prompt = load_and_fill_prompt(
            "onboard",
            conversation_history=format_history(history),
            user_message=request_data.message,
        )

        # Query Gemini
        result = await gemini.query(prompt, model=gemini_model)
        response = result.text

        # Parse the response
        parsed = parse_onboard_response(response)

        # Store messages in session
        await session_store.add_message(session_id, "user", request_data.message)
        content_str = (
            parsed["content"]
            if isinstance(parsed["content"], str)
            else str(parsed["content"])
        )
        await session_store.add_message(session_id, "assistant", content_str)

        return OnboardResponse(
            type=parsed["type"],
            content=parsed["content"],
            session_id=session_id,
        )

    except Exception as e:
        logger.error(f"Onboard error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"LLM error: {str(e)}")
