# Gemini Backend API

FastAPI backend for Google Gemini API with support for text, images, PDFs, and multi-media queries.

## Quick Start

```bash
# Install dependencies
cd backend
uv sync

# Set your API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run the server
uv run uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/query` | POST | Simple text query |
| `/api/chat/completions` | POST | Multi-turn chat |
| `/api/media/query` | POST | Multi-media query (images, PDFs, etc.) |
| `/api/image/generate` | POST | Generate images |
| `/api/image/edit` | POST | Edit images |
| `/health` | GET | Health check |

---

## API Reference

### 1. Simple Text Query

```bash
curl -X POST http://localhost:8000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 2+2?"}'
```

**Request:**
```json
{
  "prompt": "What is 2+2?",
  "model": "gemini-2.5-flash",      // optional
  "system_prompt": "Be concise"      // optional
}
```

**Response:**
```json
{
  "text": "4",
  "model": "gemini-2.5-flash",
  "usage": {"prompt_tokens": 5, "completion_tokens": 1, "total_tokens": 6}
}
```

---

### 2. Multi-Media Query

Send images, PDFs, text files, or any combination with a text prompt.

```bash
# Query with an image
curl -X POST http://localhost:8000/api/media/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What do you see in this image?",
    "files": [
      {"data": "'$(base64 -i image.png)'", "mime_type": "image/png"}
    ]
  }'
```

**Request:**
```json
{
  "prompt": "Compare these two images",
  "files": [
    {"data": "<base64-encoded-data>", "mime_type": "image/png"},
    {"data": "<base64-encoded-data>", "mime_type": "image/jpeg"}
  ],
  "model": "gemini-2.5-flash",           // optional
  "response_modalities": ["TEXT"],        // optional: ["TEXT"] or ["TEXT", "IMAGE"]
  "system_prompt": "Be detailed"          // optional
}
```

**Supported MIME types:**
- Images: `image/png`, `image/jpeg`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `text/plain`
- Audio: `audio/mp3`, `audio/wav`
- Video: `video/mp4`

**Response:**
```json
{
  "text": "The first image shows...",
  "images": [],
  "model": "gemini-2.5-flash",
  "usage": {"prompt_tokens": 100, "total_tokens": 150}
}
```

---

### 3. Image Generation

Generate images from text or reference images.

```bash
# Text-to-image
curl -X POST http://localhost:8000/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A red apple on a white background"}'
```

**Request:**
```json
{
  "prompt": "A red apple on a white background",
  "model": "gemini-2.5-flash-image",    // optional
  "aspect_ratio": "1:1"                  // optional: "1:1", "16:9", "9:16"
}
```

**Response:**
```json
{
  "text": "Here is your generated image",
  "images": [
    {"data": "<base64-encoded-image>", "mime_type": "image/png"}
  ],
  "model": "gemini-2.5-flash-image"
}
```

---

### 4. Image Generation with References

Use `/api/media/query` with `response_modalities: ["TEXT", "IMAGE"]` to generate images based on reference images.

```bash
curl -X POST http://localhost:8000/api/media/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Combine these two colors into a new image",
    "files": [
      {"data": "'$(base64 -i red.png)'", "mime_type": "image/png"},
      {"data": "'$(base64 -i blue.png)'", "mime_type": "image/png"}
    ],
    "response_modalities": ["TEXT", "IMAGE"]
  }'
```

---

### 5. Multi-Turn Chat

```bash
curl -X POST http://localhost:8000/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "My name is Alice"},
      {"role": "assistant", "content": "Nice to meet you, Alice!"},
      {"role": "user", "content": "What is my name?"}
    ]
  }'
```

---

## Models

| Model ID | Alias | Use Case |
|----------|-------|----------|
| `gemini-2.5-flash` | - | Fast text/vision (default) |
| `gemini-2.5-flash-image` | `nano-banana` | Image generation |
| `gemini-3-pro-image-preview` | `nano-banana-pro` | Best quality images |

---

## Python Client Example

```python
import base64
import httpx

API_URL = "http://localhost:8000"

# Simple query
response = httpx.post(f"{API_URL}/api/chat/query", json={
    "prompt": "Hello!"
})
print(response.json()["text"])

# Image query
with open("photo.jpg", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode()

response = httpx.post(f"{API_URL}/api/media/query", json={
    "prompt": "Describe this image",
    "files": [{"data": image_b64, "mime_type": "image/jpeg"}]
})
print(response.json()["text"])

# Generate image
response = httpx.post(f"{API_URL}/api/image/generate", json={
    "prompt": "A sunset over mountains"
})
if response.json()["images"]:
    img_data = base64.b64decode(response.json()["images"][0]["data"])
    with open("output.png", "wb") as f:
        f.write(img_data)
```

---

## JavaScript/Fetch Example

```javascript
// Simple query
const response = await fetch('http://localhost:8000/api/chat/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello!' })
});
const data = await response.json();
console.log(data.text);

// Image query (browser)
async function queryWithImage(file) {
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });

  const response = await fetch('http://localhost:8000/api/media/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Describe this image',
      files: [{ data: base64, mime_type: file.type }]
    })
  });
  return response.json();
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Your Google AI API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Default model |

Get your API key at: https://aistudio.google.com/

---

## Running Tests

```bash
# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run only unit tests (no API calls)
uv run pytest -m "not integration"

# Run integration tests (requires API key)
uv run pytest -m integration
```
