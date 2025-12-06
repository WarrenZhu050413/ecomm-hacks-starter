"""Canvas configuration models - unified config for all canvas settings."""

import json
from pathlib import Path
from typing import Any, Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict

# === MODEL TYPES ===

ModelType = Literal["flash", "pro", "flash-thinking"]


# === CARD SCHEMA ===

class CardField(BaseModel):
    """A field in the card schema."""

    name: str
    type: Literal["string", "string?"]
    display: Literal["primary", "secondary", "meta"]


class CardSchema(BaseModel):
    """Schema defining what fields a card has."""

    fields: list[CardField]


# === THEMES ===

class CardTheme(BaseModel):
    """Tailwind class-based card styling."""

    container: str = "bg-black/30 backdrop-blur-md rounded-xl border border-white/10"
    primary: str = "text-lg text-white leading-relaxed text-center"
    secondary: str = "text-base text-white/60 italic text-center mt-2"
    meta: str = "text-sm text-white/45 text-center mt-1"
    dragging: str | None = "opacity-80 scale-105 rotate-1"


class CanvasTheme(BaseModel):
    """Canvas-level visual styling."""

    background: str = "linear-gradient(160deg, #0a0a12 0%, #12121f 40%, #0a0a14 100%)"
    accent: str = "#fbbf24"

    # Image background with CSS filter post-processing (optional, overrides background if set)
    backgroundImage: str | None = None  # URL to background image (e.g., Wikimedia Commons)
    backgroundFilter: str | None = None  # CSS filter string (e.g., "blur(8px) brightness(0.3)")
    backgroundBlendMode: str | None = None  # CSS blend mode (e.g., "multiply", "overlay")
    backgroundOverlay: str | None = None  # CSS color overlay (e.g., "rgba(0,0,0,0.5)")


# === PHYSICS ===

class PhysicsConfig(BaseModel):
    """How cards move and behave."""

    cardLifetime: int = 45  # seconds (50% longer default for contemplation)
    driftSpeed: float = 1.0  # multiplier 0-3
    jiggle: float = 1.0  # intensity 0-3
    bounce: float = 0.5  # elasticity 0-1


# === MODELS ===

class ModelsConfig(BaseModel):
    """LLM model selection for different operations."""

    generation: ModelType = "flash"
    chat: ModelType = "flash"
    onboarding: ModelType = "pro"


# === SPAWNING ===

class SpawningConfig(BaseModel):
    """Auto-generation settings."""

    intervalSeconds: int = 12  # 50% longer default for less frequent generation
    minCards: int = 4
    imageWeight: float = 0.0  # Probability 0.0-1.0 that a generated card is an image


# === WRITING PANE ===

class WritingPaneConfig(BaseModel):
    """Writing pane configuration."""

    # Content
    title: str = "Ephemeral Space"
    placeholder: str = "Start writing..."
    initialContent: str | None = None  # Pre-populated template for new sessions

    # Styling (CSS values)
    background: str | None = None  # CSS background (e.g., "rgba(0,0,0,0.5)", gradient)
    textColor: str | None = None  # Color of written text
    titleColor: str | None = None  # Color of the title
    fontFamily: str | None = None  # 'serif', 'sans', 'mono', or CSS font-family


# === MAIN CONFIG ===

class CanvasConfig(BaseModel):
    """Complete unified canvas configuration."""

    model_config = ConfigDict(extra="ignore")  # Ignore extra fields like slug

    # Identity
    name: str
    hintText: str | None = None

    # Card structure
    cardSchema: CardSchema

    # Styling
    cardTheme: CardTheme
    canvasTheme: CanvasTheme

    # LLM context
    generationContext: str

    # Diversity directives (4-5 phrases that push generation in different directions)
    directives: list[str]

    # Initial content (ideally 4 items)
    seedContent: list[dict[str, str | None]] = []

    # Physics
    physics: PhysicsConfig = PhysicsConfig()

    # Models
    models: ModelsConfig = ModelsConfig()

    # Auto-spawning
    spawning: SpawningConfig = SpawningConfig()

    # Writing pane
    writingPane: WritingPaneConfig = WritingPaneConfig()


# === CARD DATA ===

# CardData allows any value type (str, bool, etc.) for flexibility
# e.g., is_ai_generated: bool for image cards
CardData = dict[str, Any]


class Card(BaseModel):
    """A card with dynamic fields validated against schema."""

    model_config = ConfigDict(extra="allow")


# === VALIDATION ===

class CardValidationError(Exception):
    """Raised when card data doesn't match schema."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Card validation failed: {'; '.join(errors)}")


def validate_card_against_schema(card_data: dict[str, Any], schema: CardSchema) -> Card:
    """Validate card data against a CardSchema."""
    errors: list[str] = []
    schema_field_names = {f.name for f in schema.fields}

    # Check for extra fields not in schema
    for key in card_data.keys():
        if key not in schema_field_names:
            errors.append(f"Unexpected field '{key}' not in schema")

    # Check each schema field
    for field in schema.fields:
        value = card_data.get(field.name)
        is_required = field.type == "string"

        if is_required:
            if field.name not in card_data:
                errors.append(f"Required field '{field.name}' is missing")
            elif value is None:
                errors.append(f"Required field '{field.name}' cannot be null")
            elif not isinstance(value, str):
                errors.append(f"Field '{field.name}' must be a string, got {type(value).__name__}")
        else:  # optional (string?)
            if field.name in card_data and value is not None:
                if not isinstance(value, str):
                    errors.append(f"Field '{field.name}' must be a string or null, got {type(value).__name__}")

    if errors:
        raise CardValidationError(errors)

    return Card(**card_data)


def validate_card_or_raise(card_data: dict[str, Any], schema: CardSchema) -> Card:
    """Validate card and raise HTTPException on failure."""
    try:
        return validate_card_against_schema(card_data, schema)
    except CardValidationError as e:
        raise HTTPException(status_code=503, detail=f"LLM returned invalid card: {e}")


# === DEFAULTS LOADER ===

_defaults_cache: dict[str, Any] | None = None


def load_defaults() -> dict[str, Any]:
    """Load default config from JSON file."""
    global _defaults_cache
    if _defaults_cache is None:
        defaults_path = Path(__file__).parent.parent.parent / "config" / "defaults.json"
        with open(defaults_path) as f:
            _defaults_cache = json.load(f)
    return _defaults_cache


def get_default_config() -> CanvasConfig:
    """Get the default CanvasConfig."""
    return CanvasConfig(**load_defaults())
