"""Gemini API service using google-genai SDK."""

import base64
import os
import time
from dataclasses import dataclass, field
from typing import Any

from google import genai
from google.genai import types

from app.services.logging_config import get_logger

logger = get_logger(__name__)


def _detect_image_mime_type(data: bytes) -> str:
    """Detect actual image MIME type from magic bytes.

    Gemini sometimes returns incorrect MIME types (e.g., JPEG labeled as PNG).
    This function checks the actual bytes to determine the real format.
    """
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    elif data[:2] == b'\xff\xd8':
        return "image/jpeg"
    elif data[:4] == b'RIFF' and len(data) > 12 and data[8:12] == b'WEBP':
        return "image/webp"
    elif data[:6] in (b'GIF87a', b'GIF89a'):
        return "image/gif"
    # Default to what Gemini claims if we can't detect
    return "image/png"


@dataclass
class GeminiResult:
    """Gemini response with metadata."""

    text: str
    model: str
    usage: dict[str, Any] | None = None


@dataclass
class ImageResult:
    """Image generation result."""

    text: str | None  # Any accompanying text
    images: list[dict[str, Any]] = field(default_factory=list)  # List of {data: base64, mime_type: str}
    model: str = ""
    usage: dict[str, Any] | None = None


@dataclass
class MediaResult:
    """Multi-media query result."""

    text: str | None = None
    images: list[dict[str, Any]] = field(default_factory=list)
    model: str = ""
    usage: dict[str, Any] | None = None


class GeminiService:
    """Service for interacting with Google Gemini API."""

    # Image model - using Gemini 3 Pro Image
    DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview"

    def __init__(self, api_key: str | None = None, default_model: str = "gemini-3-pro-preview"):
        """Initialize the Gemini service.

        Args:
            api_key: Gemini API key. Falls back to GEMINI_API_KEY env var.
            default_model: Default model to use for queries.
        """
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not provided and not found in environment")

        self.default_model = default_model
        self.client = genai.Client(api_key=self.api_key)

    async def query(
        self,
        prompt: str,
        model: str | None = None,
        system_instruction: str | None = None,
    ) -> GeminiResult:
        """Query Gemini asynchronously.

        Args:
            prompt: User prompt to send
            model: Model to use (defaults to self.default_model)
            system_instruction: Optional system prompt

        Returns:
            GeminiResult with response text and metadata
        """
        model_name = model or self.default_model
        start_time = time.time()

        logger.info("gemini_query_started", model=model_name, prompt_length=len(prompt))
        if system_instruction:
            logger.debug("gemini_query_system_instruction", instruction_length=len(system_instruction))

        config = {}
        if system_instruction:
            config["system_instruction"] = system_instruction

        try:
            response = await self.client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config if config else None,
            )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "gemini_query_failed",
                model=model_name,
                elapsed_seconds=round(elapsed, 3),
                error_type=type(e).__name__,
                error=str(e),
            )
            raise

        elapsed = time.time() - start_time

        # Extract usage info if available
        usage = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", None),
                "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", None),
                "total_tokens": getattr(response.usage_metadata, "total_token_count", None),
            }

        logger.info(
            "gemini_query_completed",
            model=model_name,
            elapsed_seconds=round(elapsed, 3),
            usage=usage,
            response_length=len(response.text) if response.text else 0,
        )

        return GeminiResult(
            text=response.text,
            model=model_name,
            usage=usage,
        )

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        system_instruction: str | None = None,
    ) -> GeminiResult:
        """Multi-turn chat with history.

        Args:
            messages: List of {"role": "user"|"assistant", "content": str}
            model: Model to use
            system_instruction: Optional system prompt

        Returns:
            GeminiResult with assistant response
        """
        model_name = model or self.default_model
        start_time = time.time()

        logger.info("gemini_chat_started", model=model_name, message_count=len(messages))

        # Convert messages to Gemini format using types.Content
        contents = []
        for msg in messages:
            role = msg.get("role", "user")
            # Gemini uses "model" instead of "assistant"
            if role == "assistant":
                role = "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])],
                )
            )

        # Build config
        config = None
        if system_instruction:
            config = types.GenerateContentConfig(system_instruction=system_instruction)

        try:
            response = await self.client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "gemini_chat_failed",
                model=model_name,
                elapsed_seconds=round(elapsed, 3),
                error_type=type(e).__name__,
                error=str(e),
            )
            raise

        elapsed = time.time() - start_time

        usage = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", None),
                "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", None),
                "total_tokens": getattr(response.usage_metadata, "total_token_count", None),
            }

        logger.info(
            "gemini_chat_completed",
            model=model_name,
            elapsed_seconds=round(elapsed, 3),
            usage=usage,
            response_length=len(response.text) if response.text else 0,
        )

        return GeminiResult(
            text=response.text,
            model=model_name,
            usage=usage,
        )

    async def generate_image(
        self,
        prompt: str,
        model: str = "gemini-3-pro-image-preview",
    ) -> ImageResult:
        """Generate images using Nano Banana (Gemini image models).

        Args:
            prompt: Text description of the image to generate
            model: Model to use (default: gemini-3-pro-image-preview)

        Returns:
            ImageResult with generated images as base64
        """
        # Always use Gemini 3 Pro Image
        model_name = self.DEFAULT_IMAGE_MODEL
        start_time = time.time()

        logger.info("gemini_image_generation_started", model=model_name, prompt_length=len(prompt))

        # Build config with image generation enabled
        config = types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        )

        try:
            response = await self.client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "gemini_image_generation_failed",
                model=model_name,
                elapsed_seconds=round(elapsed, 3),
                error_type=type(e).__name__,
                error=str(e),
            )
            raise

        elapsed = time.time() - start_time

        # Extract text and images from response
        text = None
        images = []

        if response.candidates:
            for candidate in response.candidates:
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        # Check for text content
                        if hasattr(part, "text") and part.text:
                            text = part.text
                        # Check for image content - look for inline_data with actual data
                        if hasattr(part, "inline_data") and part.inline_data:
                            inline = part.inline_data
                            if hasattr(inline, "data") and inline.data:
                                # Detect actual MIME type from bytes (Gemini often lies about format)
                                actual_mime = _detect_image_mime_type(inline.data)
                                images.append(
                                    {
                                        "data": base64.b64encode(inline.data).decode("utf-8"),
                                        "mime_type": actual_mime,
                                    }
                                )

        usage = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", None),
                "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", None),
                "total_tokens": getattr(response.usage_metadata, "total_token_count", None),
            }

        logger.info(
            "gemini_image_generation_completed",
            model=model_name,
            elapsed_seconds=round(elapsed, 3),
            image_count=len(images),
            usage=usage,
        )

        return ImageResult(
            text=text,
            images=images,
            model=model_name,
            usage=usage,
        )

    async def edit_image(
        self,
        prompt: str,
        image_data: bytes,
        image_mime_type: str = "image/png",
        model: str = "gemini-3-pro-image-preview",
    ) -> ImageResult:
        """Edit an existing image using Nano Banana.

        Args:
            prompt: Instructions for how to edit the image
            image_data: Raw image bytes
            image_mime_type: MIME type of the image
            model: Model to use

        Returns:
            ImageResult with edited image
        """
        model_name = self.DEFAULT_IMAGE_MODEL
        start_time = time.time()

        logger.info(
            "gemini_image_edit_started",
            model=model_name,
            prompt_length=len(prompt),
            image_size_bytes=len(image_data),
            image_mime_type=image_mime_type,
        )

        # Build content with both text and image
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                    types.Part.from_bytes(data=image_data, mime_type=image_mime_type),
                ],
            )
        ]

        config = types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        )

        try:
            response = await self.client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "gemini_image_edit_failed",
                model=model_name,
                elapsed_seconds=round(elapsed, 3),
                error_type=type(e).__name__,
                error=str(e),
            )
            raise

        elapsed = time.time() - start_time

        # Extract results
        text = None
        images = []

        if response.candidates:
            for candidate in response.candidates:
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, "text") and part.text:
                            text = part.text
                        if hasattr(part, "inline_data") and part.inline_data:
                            inline = part.inline_data
                            if hasattr(inline, "data") and inline.data:
                                actual_mime = _detect_image_mime_type(inline.data)
                                images.append(
                                    {
                                        "data": base64.b64encode(inline.data).decode("utf-8"),
                                        "mime_type": actual_mime,
                                    }
                                )

        usage = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", None),
                "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", None),
                "total_tokens": getattr(response.usage_metadata, "total_token_count", None),
            }

        logger.info(
            "gemini_image_edit_completed",
            model=model_name,
            elapsed_seconds=round(elapsed, 3),
            image_count=len(images),
            usage=usage,
        )

        return ImageResult(
            text=text,
            images=images,
            model=model_name,
            usage=usage,
        )

    async def multimedia_query(
        self,
        prompt: str,
        files: list[dict[str, Any]] | None = None,
        model: str | None = None,
        response_modalities: list[str] | None = None,
        system_instruction: str | None = None,
    ) -> MediaResult:
        """Query Gemini with multiple media files (images, PDFs, audio, video, text).

        Args:
            prompt: Text instruction/question
            files: List of {"data": base64_string, "mime_type": str}
            model: Model to use (defaults to self.default_model, or image model if generating)
            response_modalities: ["TEXT"] or ["TEXT", "IMAGE"] for image generation
            system_instruction: Optional system prompt

        Returns:
            MediaResult with text and/or images
        """
        start_time = time.time()

        # Determine model - use Gemini 3 Pro Image for image generation
        if response_modalities and "IMAGE" in response_modalities:
            model_name = self.DEFAULT_IMAGE_MODEL
        elif model:
            model_name = model
        else:
            model_name = self.default_model

        file_count = len(files) if files else 0
        logger.info(
            "gemini_multimedia_query_started",
            model=model_name,
            prompt_length=len(prompt),
            file_count=file_count,
            response_modalities=response_modalities,
        )

        # Build parts list: text prompt first, then files
        parts = [types.Part.from_text(text=prompt)]

        if files:
            for file_info in files:
                file_data = base64.b64decode(file_info["data"])
                mime_type = file_info["mime_type"]
                parts.append(types.Part.from_bytes(data=file_data, mime_type=mime_type))

        # Build content
        contents = [types.Content(role="user", parts=parts)]

        # Build config
        config = None
        if response_modalities or system_instruction:
            config_params = {}
            if response_modalities:
                config_params["response_modalities"] = response_modalities
            if system_instruction:
                config_params["system_instruction"] = system_instruction
            config = types.GenerateContentConfig(**config_params)

        try:
            response = await self.client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "gemini_multimedia_query_failed",
                model=model_name,
                elapsed_seconds=round(elapsed, 3),
                error_type=type(e).__name__,
                error=str(e),
            )
            raise

        elapsed = time.time() - start_time

        # Extract text and images from response
        text = None
        images = []

        if response.candidates:
            for candidate in response.candidates:
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, "text") and part.text:
                            text = part.text
                        if hasattr(part, "inline_data") and part.inline_data:
                            inline = part.inline_data
                            if hasattr(inline, "data") and inline.data:
                                actual_mime = _detect_image_mime_type(inline.data)
                                images.append(
                                    {
                                        "data": base64.b64encode(inline.data).decode("utf-8"),
                                        "mime_type": actual_mime,
                                    }
                                )

        usage = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", None),
                "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", None),
                "total_tokens": getattr(response.usage_metadata, "total_token_count", None),
            }

        logger.info(
            "gemini_multimedia_query_completed",
            model=model_name,
            elapsed_seconds=round(elapsed, 3),
            image_count=len(images),
            response_length=len(text) if text else 0,
            usage=usage,
        )

        return MediaResult(
            text=text,
            images=images,
            model=model_name,
            usage=usage,
        )

    def query_sync(
        self,
        prompt: str,
        model: str | None = None,
        system_instruction: str | None = None,
    ) -> GeminiResult:
        """Synchronous query (for non-async contexts).

        Args:
            prompt: User prompt to send
            model: Model to use
            system_instruction: Optional system prompt

        Returns:
            GeminiResult with response text and metadata
        """
        model_name = model or self.default_model
        start_time = time.time()

        logger.info("gemini_query_sync_started", model=model_name, prompt_length=len(prompt))

        config = {}
        if system_instruction:
            config["system_instruction"] = system_instruction

        try:
            response = self.client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config if config else None,
            )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "gemini_query_sync_failed",
                model=model_name,
                elapsed_seconds=round(elapsed, 3),
                error_type=type(e).__name__,
                error=str(e),
            )
            raise

        elapsed = time.time() - start_time

        usage = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", None),
                "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", None),
                "total_tokens": getattr(response.usage_metadata, "total_token_count", None),
            }

        logger.info(
            "gemini_query_sync_completed",
            model=model_name,
            elapsed_seconds=round(elapsed, 3),
            usage=usage,
            response_length=len(response.text) if response.text else 0,
        )

        return GeminiResult(
            text=response.text,
            model=model_name,
            usage=usage,
        )


# Convenience function for quick queries
async def query_gemini(
    prompt: str,
    model: str = "gemini-3-pro-preview",
    system_instruction: str | None = None,
) -> str:
    """Quick async query to Gemini.

    Args:
        prompt: User prompt
        model: Model to use
        system_instruction: Optional system prompt

    Returns:
        Response text
    """
    service = GeminiService(default_model=model)
    result = await service.query(prompt, system_instruction=system_instruction)
    return result.text
