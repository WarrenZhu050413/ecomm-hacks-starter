"""Multi-media router for Gemini API endpoints."""

import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from app.models.media import (
    GeneratedMedia,
    MediaQueryRequest,
    MediaQueryResponse,
)
from app.services.gemini import GeminiService
from app.services.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/media", tags=["media"])


def get_gemini_service(request: Request) -> GeminiService:
    """Dependency to get Gemini service from app state."""
    service = request.app.state.gemini_service
    if not service:
        raise HTTPException(status_code=503, detail="Gemini service not initialized")
    return service


@router.post("/query", response_model=MediaQueryResponse)
async def multimedia_query(
    request: MediaQueryRequest,
    gemini: Annotated[GeminiService, Depends(get_gemini_service)],
):
    """Query Gemini with multiple media files.

    Supports images (PNG, JPEG, GIF, WebP), PDFs, audio, video, and text files.
    Files are sent as base64-encoded data with their MIME types.

    For image generation, include response_modalities: ["TEXT", "IMAGE"].
    """
    start_time = time.time()
    file_count = len(request.files) if request.files else 0
    logger.info(
        "media_query_started",
        model=request.model,
        prompt_length=len(request.prompt),
        file_count=file_count,
        response_modalities=request.response_modalities,
    )

    try:
        # Convert files to format expected by service
        files = None
        if request.files:
            files = [{"data": f.data, "mime_type": f.mime_type} for f in request.files]

        result = await gemini.multimedia_query(
            prompt=request.prompt,
            files=files,
            model=request.model,
            response_modalities=request.response_modalities,
            system_instruction=request.system_prompt,
        )

        elapsed = time.time() - start_time
        logger.info(
            "media_query_completed",
            model=result.model,
            elapsed_seconds=round(elapsed, 3),
            image_count=len(result.images),
            usage=result.usage,
        )

        return MediaQueryResponse(
            text=result.text,
            images=[GeneratedMedia(data=img["data"], mime_type=img["mime_type"]) for img in result.images],
            model=result.model,
            usage=result.usage,
        )

    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(
            "media_query_failed",
            model=request.model,
            elapsed_seconds=round(elapsed, 3),
            error_type=type(e).__name__,
            error=str(e),
        )
        raise HTTPException(status_code=503, detail=f"Multi-media query error: {str(e)}")


@router.get("/supported-types")
async def list_supported_types():
    """List supported media types for multi-media queries."""
    return {
        "supported_types": [
            {"mime_type": "image/png", "description": "PNG images"},
            {"mime_type": "image/jpeg", "description": "JPEG images"},
            {"mime_type": "image/gif", "description": "GIF images"},
            {"mime_type": "image/webp", "description": "WebP images"},
            {"mime_type": "application/pdf", "description": "PDF documents"},
            {"mime_type": "text/plain", "description": "Plain text files"},
            {"mime_type": "audio/mp3", "description": "MP3 audio"},
            {"mime_type": "audio/wav", "description": "WAV audio"},
            {"mime_type": "video/mp4", "description": "MP4 video"},
        ],
        "notes": [
            "Files must be base64-encoded",
            "Multiple files can be sent in a single request",
            "For image generation, set response_modalities to ['TEXT', 'IMAGE']",
        ],
    }
