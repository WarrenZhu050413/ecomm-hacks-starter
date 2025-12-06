# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ecommerce hackathon starter using Google's Gemini 3 Pro (text) and Nano Banana Pro (image generation). React + Vite frontend with FastAPI + Python backend.

## Commands

### Frontend (root directory)
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite build
npm run lint         # ESLint (cached)
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier format
npm run test         # Vitest watch mode
npm run test:run     # Single test run
npm run typecheck    # TypeScript check
```

### Backend (cd backend/)
```bash
uv run uvicorn app.main:app --reload  # Dev server on :8000
uv run pytest tests/ -v               # All tests
uv run pytest tests/test_config.py -v # Single test file
uv run pytest -k "test_name" -v       # Single test by name
uv run ruff check app/                # Lint
uv run ruff format app/               # Format
```

## Architecture

### Backend Structure
```
backend/
├── app/
│   ├── main.py              # FastAPI app, lifespan, middleware
│   ├── config.py            # Centralized config (models, CORS, port)
│   ├── routers/             # API endpoints
│   │   ├── chat.py          # /api/chat/* - text chat
│   │   ├── image.py         # /api/image/* - image gen/edit
│   │   ├── media.py         # /api/media/* - multimodal
│   │   ├── generate.py      # /api/generate - card content
│   │   ├── onboard.py       # /api/onboard - config wizard
│   │   ├── style.py         # /api/style - visual theming
│   │   └── images.py        # /api/images/* - Wikimedia search
│   ├── models/              # Pydantic models
│   ├── services/
│   │   └── gemini.py        # GeminiService wrapper
│   └── prompts/             # LLM prompt templates (.md)
└── tests/
```

### Key Patterns

**Dependency Injection**: All routers use FastAPI `Depends` for service access:
```python
def get_gemini_service(request: Request) -> GeminiService:
    service = request.app.state.gemini_service
    if not service:
        raise HTTPException(status_code=503, detail="Gemini service not initialized")
    return service

@router.post("/endpoint")
async def endpoint(gemini: Annotated[GeminiService, Depends(get_gemini_service)]):
    ...
```

**Error Codes**:
- `503` - External service failures (Gemini API errors, service unavailable)
- `502` - Upstream API errors (Wikimedia)
- `500` - Internal bugs only

**Type Hints**: Use `T | None` not `Optional[T]`

## Configuration

**Environment Variables** (in `backend/.env`):
| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | required | Google Gemini API key |
| `CORS_ORIGINS` | localhost:3000,5173,etc | Comma-separated origins |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |

**Model Constants** (in `config.py`):
- `DEFAULT_MODEL = "gemini-3-pro-preview"` (text)
- `DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview"` (images)

## Known Issues

### Gemini Image Generation MIME Type Bug

Gemini returns images with incorrect MIME types (claims PNG but sends JPEG). Always detect from magic bytes:

```python
def _detect_image_mime_type(data: bytes) -> str:
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    elif data[:2] == b'\xff\xd8':
        return "image/jpeg"
    elif data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return "image/webp"
    return "image/png"  # fallback
```

@orchestra.md
