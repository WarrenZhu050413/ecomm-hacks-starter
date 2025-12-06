## Gemini Image Generation MIME Type Bug

**Issue:** Gemini's image generation models (including `gemini-3-pro-image-preview` / Nano Banana Pro) return images with **incorrect MIME types**. The API claims images are `image/png` but the actual bytes are JPEG.

**Symptoms:**

- Claude API errors: "Image does not match the provided media type image/png"
- File inspection shows JPEG magic bytes (`\xff\xd8`) despite PNG declaration

**Solution:** Always detect actual image format from magic bytes, never trust Gemini's declared `mime_type`:

```python
def _detect_image_mime_type(data: bytes) -> str:
    """Detect actual image MIME type from magic bytes."""
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    elif data[:2] == b'\xff\xd8':
        return "image/jpeg"
    elif data[:4] == b'RIFF' and len(data) > 12 and data[8:12] == b'WEBP':
        return "image/webp"
    elif data[:6] in (b'GIF87a', b'GIF89a'):
        return "image/gif"
    return "image/png"  # fallback
```

**Affected:** `google-genai` SDK, `generate_image()` responses, any `inline_data` with images.
@orchestra.md
