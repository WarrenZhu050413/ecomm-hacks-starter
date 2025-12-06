"""Main FastAPI application for Gemini backend."""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat, image, media, onboard, generate, style, images
from app.services.gemini import GeminiService

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown."""
    logger.info("Starting Gemini backend...")

    # Initialize Gemini service
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set - API calls will fail")

    default_model = os.environ.get("GEMINI_MODEL", "gemini-3-pro-preview")

    try:
        app.state.gemini_service = GeminiService(api_key=api_key, default_model=default_model)
        logger.info(f"Gemini service initialized with model: {default_model}")
    except ValueError as e:
        logger.error(f"Failed to initialize Gemini service: {e}")
        # Create a placeholder service that will error on use
        app.state.gemini_service = None

    logger.info("Gemini backend ready at http://localhost:8000")

    yield

    logger.info("Shutting down Gemini backend...")


app = FastAPI(
    title="Gemini Backend API",
    description="FastAPI backend for Google Gemini API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4173",
        "http://localhost:4174",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(image.router)
app.include_router(media.router)

# Ephemeral canvas routers
app.include_router(onboard.router)
app.include_router(generate.router)
app.include_router(style.router)
app.include_router(images.router)


@app.get("/")
async def root():
    """API root - list available endpoints."""
    return {
        "name": "Gemini Backend API",
        "version": "0.1.0",
        "endpoints": {
            # Core Gemini endpoints
            "chat_completions": "POST /api/chat/completions",
            "simple_query": "POST /api/chat/query",
            "list_chat_models": "GET /api/chat/models",
            "generate_image": "POST /api/image/generate",
            "edit_image": "POST /api/image/edit",
            "list_image_models": "GET /api/image/models",
            "multimedia_query": "POST /api/media/query",
            "list_media_types": "GET /api/media/supported-types",
            # Ephemeral canvas endpoints
            "onboard": "POST /api/onboard",
            "generate": "POST /api/generate",
            "style": "POST /api/style",
            "images_search": "GET /api/images/search",
            "images_random": "GET /api/images/random",
            "health": "GET /health",
        },
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
