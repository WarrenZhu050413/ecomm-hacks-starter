"""Request and response models for Ephemeral API endpoints."""

from pydantic import BaseModel, model_validator

from typing import Optional

from .canvas_config import (
    CanvasConfig,
    CardData,
    CardTheme,
    CanvasTheme,
    PhysicsConfig,
    CardValidationError,
    validate_card_against_schema,
)


class GenerateRequest(BaseModel):
    """Request to generate new content.

    Model is taken from config.models.generation.
    """

    config: CanvasConfig
    user_composition: str = ""
    existing_cards: list[CardData] = []
    directive: str | None = None  # Creative direction for this generation
    image_card: bool = False  # If True, generate an image card using Wikimedia

    @model_validator(mode="after")
    def validate_existing_cards(self) -> "GenerateRequest":
        """Validate existing_cards against config schema.

        Image cards (with image_url field) are skipped since they have
        a different structure than text cards.
        """
        for i, card_data in enumerate(self.existing_cards):
            # Skip image cards - they have different fields
            if "image_url" in card_data:
                continue
            try:
                validate_card_against_schema(card_data, self.config.cardSchema)
            except CardValidationError as e:
                raise ValueError(f"existing_cards[{i}]: {e}") from e
        return self


class GenerateResponse(BaseModel):
    """Response with generated card and cost tracking."""

    card: CardData
    cost_usd: float | None = None
    usage: dict | None = None


class OnboardRequest(BaseModel):
    """Request for onboarding conversation."""

    message: str
    session_id: str | None = None


class OnboardResponse(BaseModel):
    """Response from onboarding - either a question or final config."""

    type: str  # "question" or "config"
    content: str | dict
    session_id: str


# === Style Chat ===


class StyleRequest(BaseModel):
    """Request to modify visual style via chat."""

    message: str
    current_card_theme: CardTheme
    current_canvas_theme: CanvasTheme
    current_physics: PhysicsConfig
    session_id: Optional[str] = None


class PartialCardTheme(BaseModel):
    """Partial card theme for style updates."""

    container: Optional[str] = None
    primary: Optional[str] = None
    secondary: Optional[str] = None
    meta: Optional[str] = None
    dragging: Optional[str] = None


class PartialCanvasTheme(BaseModel):
    """Partial canvas theme for style updates."""

    background: Optional[str] = None
    accent: Optional[str] = None
    backgroundImage: Optional[str] = None  # URL to background image
    backgroundFilter: Optional[str] = None  # CSS filter string
    backgroundBlendMode: Optional[str] = None  # CSS blend mode
    backgroundOverlay: Optional[str] = None  # CSS color overlay


class PartialPhysics(BaseModel):
    """Partial physics config for style updates."""

    cardLifetime: Optional[int] = None
    driftSpeed: Optional[float] = None
    jiggle: Optional[float] = None
    bounce: Optional[float] = None


class StyleResponse(BaseModel):
    """Response from style chat - either updates or a question."""

    type: str  # "update" or "question"
    card_theme: Optional[PartialCardTheme] = None
    canvas_theme: Optional[PartialCanvasTheme] = None
    physics: Optional[PartialPhysics] = None
    explanation: Optional[str] = None  # Explanation of changes or question
    session_id: str
