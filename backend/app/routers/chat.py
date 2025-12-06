"""Chat router for Gemini API endpoints."""

import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from app.models.chat import (
    ChatRequest,
    ChatResponse,
    Message,
    SimpleQueryRequest,
    SimpleQueryResponse,
)
from app.services.gemini import GeminiService
from app.services.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


def get_gemini_service(request: Request) -> GeminiService:
    """Dependency to get Gemini service from app state."""
    service = request.app.state.gemini_service
    if not service:
        raise HTTPException(status_code=503, detail="Gemini service not initialized")
    return service


@router.post("/completions", response_model=ChatResponse)
async def chat_completions(
    request: ChatRequest,
    gemini: Annotated[GeminiService, Depends(get_gemini_service)],
):
    """Chat completion endpoint with conversation history.

    Send a list of messages and receive an assistant response.
    Messages should alternate between user and assistant roles.
    """
    start_time = time.time()
    logger.info(
        "chat_completion_started",
        model=request.model,
        message_count=len(request.messages),
    )

    try:
        # Convert messages to the format expected by Gemini
        messages = [
            {"role": msg.role, "content": msg.content} for msg in request.messages
        ]

        result = await gemini.chat(
            messages=messages,
            model=request.model,
            system_instruction=request.system_prompt,
        )

        elapsed = time.time() - start_time
        logger.info(
            "chat_completion_completed",
            model=result.model,
            elapsed_seconds=round(elapsed, 3),
            usage=result.usage,
        )

        return ChatResponse(
            message=Message(role="assistant", content=result.text),
            model=result.model,
            usage=result.usage,
        )

    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(
            "chat_completion_failed",
            model=request.model,
            elapsed_seconds=round(elapsed, 3),
            error_type=type(e).__name__,
            error=str(e),
        )
        raise HTTPException(status_code=503, detail=f"Chat completion error: {str(e)}")


@router.post("/query", response_model=SimpleQueryResponse)
async def simple_query(
    request: SimpleQueryRequest,
    gemini: Annotated[GeminiService, Depends(get_gemini_service)],
):
    """Simple one-shot query endpoint.

    Send a single prompt and receive a response.
    For conversations with history, use /completions instead.
    """
    start_time = time.time()
    logger.info(
        "simple_query_started",
        model=request.model,
        prompt_length=len(request.prompt),
    )

    try:
        result = await gemini.query(
            prompt=request.prompt,
            model=request.model,
            system_instruction=request.system_prompt,
        )

        elapsed = time.time() - start_time
        logger.info(
            "simple_query_completed",
            model=result.model,
            elapsed_seconds=round(elapsed, 3),
            usage=result.usage,
        )

        return SimpleQueryResponse(
            text=result.text,
            model=result.model,
            usage=result.usage,
        )

    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(
            "simple_query_failed",
            model=request.model,
            elapsed_seconds=round(elapsed, 3),
            error_type=type(e).__name__,
            error=str(e),
        )
        raise HTTPException(status_code=503, detail=f"Query error: {str(e)}")


@router.get("/models")
async def list_models():
    """List available Gemini models."""
    return {
        "models": [
            {
                "id": "gemini-3-pro-preview",
                "description": "Gemini 3 Pro - Best quality for all tasks",
                "default": True,
            },
        ]
    }
