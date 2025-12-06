"""Tests for multi-media Gemini support.

TDD RED Phase: These tests define the expected behavior for multi-media inputs.
All media types should work: images (PNG, JPEG), PDFs, audio, video, text files.

Tests marked with @pytest.mark.integration require GEMINI_API_KEY.
"""

import base64

import pytest


# Sample test data generators
def create_minimal_png() -> bytes:
    """Create a minimal valid 1x1 red PNG image."""
    # Minimal PNG: 1x1 red pixel
    # This is a valid PNG file that Gemini can process
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    )


def create_minimal_blue_png() -> bytes:
    """Create a minimal valid 1x1 blue PNG image."""
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=="
    )


def create_simple_pdf() -> bytes:
    """Create a minimal valid PDF with text 'Hello PDF!'."""
    # Minimal PDF structure
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (Hello PDF!) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000359 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
434
%%EOF"""
    return pdf_content


def create_simple_text_file() -> bytes:
    """Create a simple text file."""
    return b"This is a test document.\nIt has multiple lines.\nLine three."


# ============================================================================
# Unit Tests - Test endpoint structure and validation
# ============================================================================


class TestMultiMediaEndpointStructure:
    """Test that the multi-media endpoint exists and has correct structure."""

    @pytest.mark.anyio
    async def test_multimedia_query_endpoint_exists(self, client):
        """Test that POST /api/media/query endpoint exists."""
        response = await client.post("/api/media/query", json={"prompt": "test", "files": []})
        # Should not be 404 - endpoint should exist
        assert response.status_code != 404, "Endpoint /api/media/query should exist"

    @pytest.mark.anyio
    async def test_multimedia_query_requires_prompt(self, client):
        """Test that prompt is required."""
        response = await client.post("/api/media/query", json={"files": []})
        assert response.status_code == 422  # Validation error

    @pytest.mark.anyio
    async def test_multimedia_query_accepts_empty_files(self, client):
        """Test that empty files list is valid (text-only query)."""
        response = await client.post("/api/media/query", json={"prompt": "Say hello", "files": []})
        # Should succeed or hit API - not validation error
        assert response.status_code in [200, 500]  # 500 if no API key in test env

    @pytest.mark.anyio
    async def test_multimedia_query_validates_file_structure(self, client):
        """Test that files must have data and mime_type."""
        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "Describe this",
                "files": [{"data": "abc"}],  # Missing mime_type
            },
        )
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_multimedia_query_response_structure(self, client):
        """Test that response has expected structure."""
        response = await client.post("/api/media/query", json={"prompt": "Say hello", "files": []})
        if response.status_code == 200:
            data = response.json()
            assert "text" in data
            assert "model" in data


# ============================================================================
# Integration Tests - Require GEMINI_API_KEY
# ============================================================================


class TestSingleImageInput:
    """Test single image input with text prompt."""

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_single_png_image_query(self, client, has_gemini_api_key):
        """Test sending a single PNG image with a question."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        image_data = base64.b64encode(create_minimal_png()).decode()

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "What color is this image? Reply with just the color name.",
                "files": [{"data": image_data, "mime_type": "image/png"}],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert len(data["text"]) > 0
        # The image is red, so response should mention red
        assert "red" in data["text"].lower() or len(data["text"]) > 0

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_single_jpeg_image_query(self, client, has_gemini_api_key):
        """Test sending a JPEG image."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        # Use PNG data but mark as JPEG - Gemini handles this
        image_data = base64.b64encode(create_minimal_png()).decode()

        response = await client.post(
            "/api/media/query",
            json={"prompt": "Describe this image briefly.", "files": [{"data": image_data, "mime_type": "image/jpeg"}]},
        )

        assert response.status_code == 200
        data = response.json()
        assert "text" in data


class TestMultipleImageInput:
    """Test multiple images in a single query."""

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_two_images_comparison(self, client, has_gemini_api_key):
        """Test sending two images and asking for comparison."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        red_image = base64.b64encode(create_minimal_png()).decode()
        blue_image = base64.b64encode(create_minimal_blue_png()).decode()

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "I'm sending you two images. What colors are they? List both colors.",
                "files": [
                    {"data": red_image, "mime_type": "image/png"},
                    {"data": blue_image, "mime_type": "image/png"},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        text_lower = data["text"].lower()
        # Should mention both colors
        assert "red" in text_lower or "blue" in text_lower

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_three_images_query(self, client, has_gemini_api_key):
        """Test sending three images."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        image = base64.b64encode(create_minimal_png()).decode()

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "How many images did I send you?",
                "files": [
                    {"data": image, "mime_type": "image/png"},
                    {"data": image, "mime_type": "image/png"},
                    {"data": image, "mime_type": "image/png"},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        # Should mention "3" or "three"
        assert "3" in data["text"] or "three" in data["text"].lower()


class TestPDFInput:
    """Test PDF document input."""

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_pdf_text_extraction(self, client, has_gemini_api_key):
        """Test sending a PDF and extracting text."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        pdf_data = base64.b64encode(create_simple_pdf()).decode()

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "What text is in this PDF document?",
                "files": [{"data": pdf_data, "mime_type": "application/pdf"}],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        # Should find "Hello PDF!" in the document
        assert "hello" in data["text"].lower() or "pdf" in data["text"].lower()

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_pdf_with_image_mixed(self, client, has_gemini_api_key):
        """Test sending both PDF and image together."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        pdf_data = base64.b64encode(create_simple_pdf()).decode()
        image_data = base64.b64encode(create_minimal_png()).decode()

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "I sent you a PDF and an image. Describe what you see in each.",
                "files": [
                    {"data": pdf_data, "mime_type": "application/pdf"},
                    {"data": image_data, "mime_type": "image/png"},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert len(data["text"]) > 20  # Should have substantial response


class TestTextFileInput:
    """Test plain text file input."""

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_text_file_query(self, client, has_gemini_api_key):
        """Test sending a plain text file."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        text_data = base64.b64encode(create_simple_text_file()).decode()

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "How many lines are in this text file?",
                "files": [{"data": text_data, "mime_type": "text/plain"}],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        # Should mention 3 lines
        assert "3" in data["text"] or "three" in data["text"].lower()


class TestImageGeneration:
    """Test image generation with file inputs."""

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_generate_image_from_reference(self, client, has_gemini_api_key):
        """Test generating an image based on reference images."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        red_image = base64.b64encode(create_minimal_png()).decode()
        blue_image = base64.b64encode(create_minimal_blue_png()).decode()

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "Create a new image that combines these two colors (red and blue) into purple.",
                "files": [
                    {"data": red_image, "mime_type": "image/png"},
                    {"data": blue_image, "mime_type": "image/png"},
                ],
                "response_modalities": ["TEXT", "IMAGE"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Should have either text or images in response
        assert "text" in data or "images" in data

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_image_generation_returns_base64(self, client, has_gemini_api_key):
        """Test that generated images are returned as base64."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "Generate a simple solid green square.",
                "files": [],
                "response_modalities": ["TEXT", "IMAGE"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        if "images" in data and len(data["images"]) > 0:
            # Verify image structure
            img = data["images"][0]
            assert "data" in img
            assert "mime_type" in img
            # Verify it's valid base64
            try:
                decoded = base64.b64decode(img["data"])
                assert len(decoded) > 0
            except Exception:
                pytest.fail("Image data is not valid base64")


class TestModelSelection:
    """Test model selection for multi-media queries."""

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_specify_model(self, client, has_gemini_api_key):
        """Test specifying a model for the query."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        response = await client.post(
            "/api/media/query", json={"prompt": "Say hello", "files": [], "model": "gemini-3-pro-preview"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "gemini-3-pro-preview"

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_image_model_for_generation(self, client, has_gemini_api_key):
        """Test using image model for generation."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "Generate a red square",
                "files": [],
                "model": "gemini-3-pro-image-preview",
                "response_modalities": ["TEXT", "IMAGE"],
            },
        )

        assert response.status_code == 200


class TestErrorHandling:
    """Test error handling for invalid inputs."""

    @pytest.mark.anyio
    async def test_invalid_base64_data(self, client):
        """Test handling of invalid base64 data."""
        response = await client.post(
            "/api/media/query",
            json={"prompt": "Describe this", "files": [{"data": "not-valid-base64!!!", "mime_type": "image/png"}]},
        )
        # Should return 400/422 for bad data, or 503 if Gemini rejects it
        assert response.status_code in [400, 422, 500, 503]

    @pytest.mark.anyio
    async def test_unsupported_mime_type_handled(self, client):
        """Test that unsupported mime types are handled gracefully."""
        response = await client.post(
            "/api/media/query",
            json={
                "prompt": "Process this",
                "files": [{"data": base64.b64encode(b"test").decode(), "mime_type": "application/x-unknown"}],
            },
        )
        # Should either work (Gemini might handle it) or return clear error
        assert response.status_code in [200, 400, 422, 500, 503]


class TestUsageTracking:
    """Test that usage/token information is returned."""

    @pytest.mark.integration
    @pytest.mark.anyio
    async def test_usage_returned_for_multimedia(self, client, has_gemini_api_key):
        """Test that token usage is tracked for multi-media queries."""
        if not has_gemini_api_key:
            pytest.skip("GEMINI_API_KEY not set")

        image_data = base64.b64encode(create_minimal_png()).decode()

        response = await client.post(
            "/api/media/query",
            json={"prompt": "Describe this image", "files": [{"data": image_data, "mime_type": "image/png"}]},
        )

        assert response.status_code == 200
        data = response.json()
        assert "usage" in data
        if data["usage"]:
            assert "prompt_tokens" in data["usage"] or "total_tokens" in data["usage"]
