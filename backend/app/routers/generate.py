"""Generate router - Create new content cards."""

import json
import logging
import re
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException, Request

from app.models.canvas_config import validate_card_or_raise
from app.models.ephemeral import GenerateRequest, GenerateResponse
from app.services.prompt_loader import load_and_fill_prompt
from app.services.xml_parser import parse_card_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ephemeral"])

# Model mapping - using latest Gemini 3 Pro models
MODEL_MAP = {
    "pro": "gemini-3-pro-preview",
    "flash": "gemini-3-pro-preview",  # Use pro for everything
    "flash-thinking": "gemini-3-pro-preview",
}

# Wikimedia API constants
WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "EphemeralCanvas/1.0"


def _search_wikimedia_sync(query_text: str, count: int = 5) -> list[dict]:
    """Synchronous Wikimedia search."""
    # Step 1: Search for files
    search_params = {
        "action": "query",
        "list": "search",
        "srsearch": query_text,
        "srnamespace": "6",  # File namespace
        "srlimit": str(count * 3),
        "format": "json",
    }
    search_url = f"{WIKIMEDIA_API}?{urllib.parse.urlencode(search_params)}"

    req = urllib.request.Request(search_url)
    req.add_header("User-Agent", USER_AGENT)

    with urllib.request.urlopen(req, timeout=10) as response:
        search_data = json.loads(response.read().decode())

    results = search_data.get("query", {}).get("search", [])
    if not results:
        return []

    # Step 2: Get image URLs for those titles
    titles = "|".join([r["title"] for r in results])
    info_params = {
        "action": "query",
        "titles": titles,
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": "800",
        "format": "json",
    }
    info_url = f"{WIKIMEDIA_API}?{urllib.parse.urlencode(info_params)}"

    req = urllib.request.Request(info_url)
    req.add_header("User-Agent", USER_AGENT)

    with urllib.request.urlopen(req, timeout=10) as response:
        info_data = json.loads(response.read().decode())

    # Parse results - filter for actual images only
    images = []
    pages = info_data.get("query", {}).get("pages", {})
    allowed_mimes = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}

    for page_data in pages.values():
        if "imageinfo" not in page_data:
            continue
        info = page_data["imageinfo"][0]

        # Skip non-image files
        mime = info.get("mime", "")
        if mime not in allowed_mimes:
            continue

        extmeta = info.get("extmetadata", {})

        desc = extmeta.get("ImageDescription", {}).get("value", "")
        if desc:
            desc = re.sub(r"<[^>]+>", "", desc)[:200]

        artist = extmeta.get("Artist", {}).get("value", "")
        if artist:
            artist = re.sub(r"<[^>]+>", "", artist)

        license_info = extmeta.get("LicenseShortName", {}).get("value", "")

        images.append({
            "url": info.get("url", ""),
            "thumbnail": info.get("thumburl", info.get("url", "")),
            "title": page_data.get("title", "").replace("File:", ""),
            "description": desc,
            "attribution": artist,
            "license": license_info,
        })

        if len(images) >= count:
            break

    return images[:count]


# Image card prompt template
IMAGE_CARD_PROMPT = """You are generating an image card that complements the user's writing context.

## Context

User is writing about: {user_context}
Canvas: {config_name}

## Task

Based on the context above, suggest a search query for finding a relevant image on Wikimedia Commons.
Then, I will provide you with search results. Choose the best one and output a card.

Your output should be:
1. First, suggest a search query inside <search_query> tags
2. After seeing results, output the final card

<search_query>your search terms here</search_query>
"""

IMAGE_CARD_SELECTION_PROMPT = """Based on these Wikimedia search results:

{search_results}

Choose the most evocative and relevant image for the context: {user_context}

Output a single image card in this JSON format inside <card> tags:
<card>{{"image_url": "full URL from results", "thumbnail": "thumbnail URL", "caption": "evocative caption you write", "attribution": "artist, license from results"}}</card>
"""


async def _generate_image_card(
    gemini,
    user_composition: str,
    config_name: str,
    model: str
) -> dict:
    """Generate an image card with Wikimedia search.

    First asks LLM for search query, then does search, then asks for selection.
    """
    # Step 1: Get search query from LLM
    query_prompt = IMAGE_CARD_PROMPT.format(
        user_context=user_composition or "general creative content",
        config_name=config_name,
    )

    result = await gemini.query(query_prompt, model=model)

    # Extract search query
    search_query = "nature landscape"  # fallback
    if "<search_query>" in result.text:
        start = result.text.find("<search_query>") + len("<search_query>")
        end = result.text.find("</search_query>")
        if end > start:
            search_query = result.text[start:end].strip()

    # Step 2: Do Wikimedia search
    images = _search_wikimedia_sync(search_query, count=5)

    if not images:
        # Try a broader fallback search
        images = _search_wikimedia_sync("nature landscape", count=3)
        if not images:
            raise ValueError("Could not find any images")

    # Step 3: Ask LLM to select best image
    search_results = "\n".join([
        f"{i+1}. {img['title']}\n   URL: {img['url']}\n   Thumbnail: {img['thumbnail']}\n   Attribution: {img.get('attribution', 'Unknown')}, {img.get('license', 'CC BY-SA')}"
        for i, img in enumerate(images)
    ])

    selection_prompt = IMAGE_CARD_SELECTION_PROMPT.format(
        search_results=search_results,
        user_context=user_composition or "general creative content",
    )

    selection_result = await gemini.query(selection_prompt, model=model)
    card = parse_card_response(selection_result.text)

    # Validate we got the required fields
    if not card.get("image_url"):
        # Use first result as fallback
        img = images[0]
        return {
            "image_url": img["url"],
            "thumbnail": img["thumbnail"],
            "caption": "A moment of reflection",
            "attribution": f"{img.get('attribution', 'Wikimedia Commons')}, {img.get('license', 'CC BY-SA')}",
        }

    return {
        "image_url": card["image_url"],
        "thumbnail": card.get("thumbnail", card["image_url"]),
        "caption": card.get("caption", ""),
        "attribution": card.get("attribution", "Wikimedia Commons, CC BY-SA"),
    }


@router.post("/generate")
async def generate(request_data: GenerateRequest, request: Request) -> GenerateResponse:
    """Generate new content based on config.

    Model is determined by config.models.generation.
    Returns card with cost tracking information.
    """
    try:
        gemini = request.app.state.gemini_service
        if not gemini:
            raise HTTPException(status_code=503, detail="Gemini service not initialized")

        # Get model
        gen_model = request_data.config.models.generation
        gemini_model = MODEL_MAP.get(gen_model, "gemini-2.5-flash")

        # Handle image card generation separately
        if request_data.image_card:
            card = await _generate_image_card(
                gemini,
                request_data.user_composition,
                request_data.config.name,
                gemini_model,
            )
            return GenerateResponse(card=card, cost_usd=None, usage=None)

        # Format the card schema as JSON
        schema_json = json.dumps(request_data.config.cardSchema.model_dump(), indent=2)

        # Format existing cards for context
        existing_str = "(none)"
        if request_data.existing_cards:
            lines = [f"{i}. {json.dumps(card)}" for i, card in enumerate(request_data.existing_cards, 1)]
            existing_str = "\n".join(lines)

        # Build directive section (only if directive provided)
        directive_section = ""
        if request_data.directive:
            directive_section = f"""<diversity_directive>
For this generation, follow this creative direction:
{request_data.directive}
</diversity_directive>"""

        # Load and fill the prompt template
        prompt = load_and_fill_prompt(
            "generate",
            config_name=request_data.config.name,
            user_composition=request_data.user_composition or "(none)",
            card_schema=schema_json,
            generation_context=request_data.config.generationContext,
            directive_section=directive_section,
            existing_cards=existing_str,
            image_card_section="",
        )

        # Query Gemini
        result = await gemini.query(prompt, model=gemini_model)
        card = parse_card_response(result.text)

        # Validate LLM output against schema
        validate_card_or_raise(card, request_data.config.cardSchema)

        return GenerateResponse(card=card, cost_usd=None, usage=result.usage)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"Generation error: {str(e)}")
