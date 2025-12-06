"""Unified generation storage - saves all generated content (images + text) to disk."""

import base64
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from app.services.logging_config import get_logger

logger = get_logger(__name__)

# Storage directories
DATA_DIR = Path(__file__).parent.parent.parent / "data"
IMAGES_DIR = DATA_DIR / "generated" / "images"
LOGS_DIR = DATA_DIR / "generated" / "logs"

# Ensure directories exist
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)


def _get_date_dir(base_dir: Path) -> Path:
    """Get or create today's date directory."""
    date_dir = base_dir / datetime.now().strftime("%Y-%m-%d")
    date_dir.mkdir(exist_ok=True)
    return date_dir


def _generate_id() -> str:
    """Generate a unique ID for this generation."""
    return f"{datetime.now().strftime('%H%M%S')}_{uuid.uuid4().hex[:6]}"


def save_image(
    image_base64: str,
    mime_type: str = "image/png",
    generation_id: str | None = None,
) -> str:
    """Save a base64 image to disk.

    Args:
        image_base64: Base64-encoded image data (no data: prefix)
        mime_type: MIME type to determine extension
        generation_id: Optional ID to use (for linking with logs)

    Returns:
        Relative file path from data/generated/images/
    """
    date_dir = _get_date_dir(IMAGES_DIR)
    gen_id = generation_id or _generate_id()

    # Determine extension
    ext = "png" if "png" in mime_type else "jpg" if "jpeg" in mime_type else "webp"
    filename = f"img_{gen_id}.{ext}"
    filepath = date_dir / filename

    # Decode and save
    image_bytes = base64.b64decode(image_base64)
    filepath.write_bytes(image_bytes)

    rel_path = f"{date_dir.name}/{filename}"

    logger.info(
        "image_saved",
        path=rel_path,
        size_bytes=len(image_bytes),
    )

    return rel_path


def save_generation_log(
    endpoint: str,
    prompt: str,
    response_text: str | None = None,
    images: list[dict] | None = None,
    metadata: dict[str, Any] | None = None,
    generation_id: str | None = None,
) -> str:
    """Save a generation log entry to disk.

    Args:
        endpoint: API endpoint that generated this (e.g., "/api/generate", "/api/image/generate")
        prompt: The prompt used for generation
        response_text: Text response from the model (if any)
        images: List of image info dicts with {path, mime_type}
        metadata: Additional metadata (model, usage, config, etc.)
        generation_id: Optional ID to use (for linking with images)

    Returns:
        Relative file path to the log entry
    """
    date_dir = _get_date_dir(LOGS_DIR)
    gen_id = generation_id or _generate_id()
    filename = f"gen_{gen_id}.json"
    filepath = date_dir / filename

    log_entry = {
        "id": gen_id,
        "timestamp": datetime.now().isoformat(),
        "endpoint": endpoint,
        "prompt": prompt,
        "response_text": response_text,
        "images": images or [],
        "metadata": metadata or {},
    }

    filepath.write_text(json.dumps(log_entry, indent=2, ensure_ascii=False))

    rel_path = f"{date_dir.name}/{filename}"

    logger.info(
        "generation_logged",
        path=rel_path,
        endpoint=endpoint,
        has_text=bool(response_text),
        image_count=len(images) if images else 0,
    )

    return rel_path


def save_generation(
    endpoint: str,
    prompt: str,
    response_text: str | None = None,
    images_base64: list[dict] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict:
    """Save a complete generation (images + log) to disk.

    This is the main function to use - it handles both images and logs together.

    Args:
        endpoint: API endpoint that generated this
        prompt: The prompt used for generation
        response_text: Text response from the model (if any)
        images_base64: List of dicts with {data: base64, mime_type: str}
        metadata: Additional metadata

    Returns:
        Dict with {generation_id, log_path, image_paths: [...]}
    """
    gen_id = _generate_id()
    image_paths = []

    # Save each image
    if images_base64:
        for i, img in enumerate(images_base64):
            img_id = f"{gen_id}_{i}" if len(images_base64) > 1 else gen_id
            try:
                path = save_image(
                    image_base64=img["data"],
                    mime_type=img.get("mime_type", "image/png"),
                    generation_id=img_id,
                )
                image_paths.append({"path": path, "mime_type": img.get("mime_type", "image/png")})
            except Exception as e:
                logger.warning("image_save_failed", error=str(e), index=i)
                image_paths.append(None)

    # Save the log entry
    log_path = save_generation_log(
        endpoint=endpoint,
        prompt=prompt,
        response_text=response_text,
        images=[p for p in image_paths if p],  # Filter out failed saves
        metadata=metadata,
        generation_id=gen_id,
    )

    return {
        "generation_id": gen_id,
        "log_path": log_path,
        "image_paths": image_paths,
    }


def list_generation_logs(date: str | None = None) -> list[dict]:
    """List generation logs, optionally filtered by date.

    Args:
        date: Date string YYYY-MM-DD, or None for all

    Returns:
        List of log entries (parsed JSON)
    """
    logs = []

    if date:
        dirs = [LOGS_DIR / date] if (LOGS_DIR / date).exists() else []
    else:
        dirs = sorted([d for d in LOGS_DIR.iterdir() if d.is_dir()], reverse=True)

    for date_dir in dirs:
        for log_path in sorted(date_dir.glob("gen_*.json"), reverse=True):
            try:
                log_entry = json.loads(log_path.read_text())
                logs.append(log_entry)
            except Exception as e:
                logger.warning("log_parse_failed", path=str(log_path), error=str(e))

    return logs


def get_image_path(date: str, filename: str) -> Path | None:
    """Get full path to a saved image.

    Args:
        date: Date string YYYY-MM-DD
        filename: Image filename

    Returns:
        Full Path to image, or None if not found
    """
    filepath = IMAGES_DIR / date / filename
    if filepath.exists():
        return filepath
    return None
