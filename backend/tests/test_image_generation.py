"""Rigorous tests for Nano Banana Pro image generation.

Tests the image generation flow to ensure:
1. Images are actually generated (not stock photos)
2. Response format is correct (base64 data URL)
3. Gemini 3 Pro Image model is used
"""

import base64
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.routers.generate import _generate_image_card
from app.services.gemini import GeminiService, ImageResult
from app.services.prompt_loader import load_prompt


@pytest.fixture
def mock_gemini_service():
    """Create a mock Gemini service with image generation."""
    service = MagicMock(spec=GeminiService)

    # Create realistic mock image result
    fake_image_data = base64.b64encode(b"fake_png_image_bytes_here").decode("utf-8")

    async_mock = AsyncMock(return_value=ImageResult(
        text="A beautiful artistic rendering capturing the essence of creativity",
        images=[{
            "data": fake_image_data,
            "mime_type": "image/png"
        }],
        model="gemini-3-pro-image-preview",
        usage={"prompt_tokens": 50, "completion_tokens": 100, "total_tokens": 150}
    ))

    service.generate_image = async_mock
    return service


class TestImageGenerationFunction:
    """Direct tests for _generate_image_card function."""

    @pytest.mark.asyncio
    async def test_returns_base64_data_url(self, mock_gemini_service):
        """Verify that image generation returns a data URL, not an external URL."""
        result = await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="Writing about nature and creativity",
            config_name="Test Canvas",
        )

        # KEY CHECK: image_url should be a data URL, not http://
        assert result["image_url"].startswith("data:image/"), \
            f"Expected data URL, got: {result['image_url'][:50]}..."

        # Verify it's base64 encoded
        assert ";base64," in result["image_url"]

    @pytest.mark.asyncio
    async def test_uses_nano_banana_pro_model(self, mock_gemini_service):
        """Verify that gemini-3-pro-image-preview is used for image generation."""
        await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="Test",
            config_name="Test Canvas",
        )

        # Verify the mock was called with the correct model
        mock_gemini_service.generate_image.assert_called_once()
        call_kwargs = mock_gemini_service.generate_image.call_args.kwargs

        assert call_kwargs.get("model") == "gemini-3-pro-image-preview", \
            f"Expected gemini-3-pro-image-preview, got: {call_kwargs.get('model')}"

    @pytest.mark.asyncio
    async def test_passes_context_in_prompt(self, mock_gemini_service):
        """Verify that user composition is included in the image prompt."""
        await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="The beauty of nature and artistic expression",
            config_name="Creative Canvas",
        )

        # Check the prompt passed to generate_image
        call_kwargs = mock_gemini_service.generate_image.call_args.kwargs
        prompt = call_kwargs.get("prompt", "")

        # User context should be in the prompt
        assert "nature" in prompt.lower() or "artistic" in prompt.lower(), \
            f"User context not found in prompt: {prompt[:200]}..."

        # Config name should be in the prompt
        assert "Creative Canvas" in prompt

    @pytest.mark.asyncio
    async def test_has_required_fields(self, mock_gemini_service):
        """Verify the image card response has all required fields."""
        result = await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="Test context",
            config_name="Test Canvas",
        )

        # Required fields for image cards
        required_fields = ["image_url", "thumbnail", "caption", "attribution"]
        for field in required_fields:
            assert field in result, f"Missing required field: {field}"

    @pytest.mark.asyncio
    async def test_marks_ai_generated(self, mock_gemini_service):
        """Verify the response includes is_ai_generated flag."""
        result = await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="Test",
            config_name="Test Canvas",
        )

        # Should have flag indicating AI generation (not stock photo)
        assert result.get("is_ai_generated") is True, \
            "Missing is_ai_generated flag - cannot distinguish from stock photos"

    @pytest.mark.asyncio
    async def test_no_external_url_in_response(self, mock_gemini_service):
        """Ensure no external URLs (Wikimedia, etc.) are in the response."""
        result = await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="Test",
            config_name="Test Canvas",
        )

        # Check all URL fields
        for field in ["image_url", "thumbnail"]:
            value = result.get(field, "")
            assert not value.startswith("http://"), \
                f"Found external HTTP URL in {field}: {value}"
            assert not value.startswith("https://"), \
                f"Found external HTTPS URL in {field}: {value}"
            assert "wikimedia" not in value.lower(), \
                f"Found Wikimedia reference in {field}"

    @pytest.mark.asyncio
    async def test_empty_context_still_generates_image(self, mock_gemini_service):
        """Verify image generation works even with empty user composition."""
        result = await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="",
            config_name="Test Canvas",
        )

        assert result["image_url"].startswith("data:image/")

    @pytest.mark.asyncio
    async def test_attribution_mentions_gemini_or_nano_banana(self, mock_gemini_service):
        """Verify attribution clearly indicates AI generation source."""
        result = await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="Test",
            config_name="Test Canvas",
        )

        attribution = result.get("attribution", "").lower()
        assert "gemini" in attribution or "nano banana" in attribution, \
            f"Attribution should mention Gemini or Nano Banana: {result.get('attribution')}"

    @pytest.mark.asyncio
    async def test_caption_from_model_response(self, mock_gemini_service):
        """Verify caption is derived from model's text response."""
        result = await _generate_image_card(
            gemini=mock_gemini_service,
            user_composition="Test",
            config_name="Test Canvas",
        )

        # The mock returns text, so caption should be based on it
        assert result.get("caption")
        assert len(result["caption"]) > 0


class TestImageGenerationFailures:
    """Tests for error handling in image generation."""

    @pytest.mark.asyncio
    async def test_raises_when_no_images_returned(self):
        """Test that ValueError is raised when Gemini returns no images."""
        mock_service = MagicMock(spec=GeminiService)
        mock_service.generate_image = AsyncMock(return_value=ImageResult(
            text="Some text but no images",
            images=[],  # Empty!
            model="gemini-3-pro-image-preview",
            usage=None
        ))

        with pytest.raises(ValueError, match="no images"):
            await _generate_image_card(
                gemini=mock_service,
                user_composition="Test",
                config_name="Test",
            )

    @pytest.mark.asyncio
    async def test_propagates_api_errors(self):
        """Test that API errors are propagated."""
        mock_service = MagicMock(spec=GeminiService)
        mock_service.generate_image = AsyncMock(
            side_effect=Exception("API quota exceeded")
        )

        with pytest.raises(Exception, match="quota"):
            await _generate_image_card(
                gemini=mock_service,
                user_composition="Test",
                config_name="Test",
            )


class TestPromptTemplate:
    """Tests for the image generation prompt."""

    def test_prompt_template_has_placeholders(self):
        """Verify prompt template has required placeholders."""
        prompt = load_prompt("image_generation")
        assert "{user_context}" in prompt
        assert "{config_name}" in prompt

    def test_prompt_requests_artistic_style(self):
        """Verify prompt asks for artistic (not stock photo) images."""
        prompt = load_prompt("image_generation")
        prompt_lower = prompt.lower()
        assert "artistic" in prompt_lower or "creative" in prompt_lower
        assert "stock" in prompt_lower  # Should mention "not stock photo style"


# Integration test script (run separately)
@pytest.mark.integration
@pytest.mark.skipif(
    not pytest.importorskip("os").environ.get("GEMINI_API_KEY"),
    reason="GEMINI_API_KEY not set"
)
class TestRealImageGeneration:
    """Integration tests with real Gemini API.

    Run with: pytest tests/test_image_generation.py -v -m integration
    """

    @pytest.mark.asyncio
    async def test_real_image_generation(self):
        """Test actual image generation with real API."""
        import os

        from app.services.gemini import GeminiService

        service = GeminiService(api_key=os.environ["GEMINI_API_KEY"])

        print("\n=== Testing Real Image Generation ===")

        result = await _generate_image_card(
            gemini=service,
            user_composition="A serene forest scene with morning light filtering through the trees",
            config_name="Nature Canvas",
        )

        print(f"Image URL starts with: {result['image_url'][:50]}...")
        print(f"Caption: {result.get('caption', 'N/A')}")
        print(f"Attribution: {result.get('attribution', 'N/A')}")
        print(f"Is AI Generated: {result.get('is_ai_generated', 'N/A')}")

        # Verify it's a data URL
        assert result["image_url"].startswith("data:image/")

        # Decode and check it's valid base64
        data_part = result["image_url"].split(",")[1]
        decoded = base64.b64decode(data_part)
        print(f"Decoded image size: {len(decoded)} bytes")
        assert len(decoded) > 1000, "Image too small, might be corrupted"

        # Save to file for visual inspection
        with open("/tmp/test_generated_image.png", "wb") as f:
            f.write(decoded)
        print("Saved to /tmp/test_generated_image.png for inspection")
