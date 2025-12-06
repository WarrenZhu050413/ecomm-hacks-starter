"""Image search router - Wikimedia Commons integration."""

import re

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/images", tags=["images"])

WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php"


class ImageResult(BaseModel):
    """A single image search result."""

    url: str  # Full-size image URL
    thumbnail: str  # Thumbnail URL (400px width)
    title: str  # Image title/filename
    description: str | None = None  # Image description if available
    attribution: str | None = None  # Artist/author attribution


class ImageSearchResponse(BaseModel):
    """Response from image search."""

    results: list[ImageResult]
    query: str


@router.get("/search", response_model=ImageSearchResponse)
async def search_images(
    query: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
) -> ImageSearchResponse:
    """
    Search Wikimedia Commons for images.

    Returns image URLs, thumbnails, and metadata for the given query.
    """
    # Build Wikimedia API request
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",  # Only bitmap images
        "gsrnamespace": "6",  # File namespace
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "iiurlwidth": "400",  # Thumbnail width
        "format": "json",
        "origin": "*",  # CORS
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                WIKIMEDIA_API_URL,
                params=params,
                headers={"User-Agent": "Ephemeral Canvas/1.0"},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Wikimedia API error: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch images: {e}")

    # Parse results
    results: list[ImageResult] = []
    pages = data.get("query", {}).get("pages", {})

    for page in pages.values():
        imageinfo = page.get("imageinfo", [{}])[0]
        if not imageinfo:
            continue

        # Get URLs
        url = imageinfo.get("url", "")
        thumbnail = imageinfo.get("thumburl", url)  # Fallback to full URL

        # Get metadata
        extmetadata = imageinfo.get("extmetadata", {})
        description = extmetadata.get("ImageDescription", {}).get("value", "")
        artist = extmetadata.get("Artist", {}).get("value", "")

        # Clean up HTML in description/artist
        if description:
            description = re.sub(r"<[^>]+>", "", description)[:200]

        if artist:
            artist = re.sub(r"<[^>]+>", "", artist)

        results.append(
            ImageResult(
                url=url,
                thumbnail=thumbnail,
                title=page.get("title", "").replace("File:", ""),
                description=description or None,
                attribution=artist or None,
            )
        )

    return ImageSearchResponse(results=results, query=query)


@router.get("/random", response_model=ImageSearchResponse)
async def get_random_images(
    category: str = Query(
        "Featured_pictures_on_Wikimedia_Commons",
        description="Wikimedia category to sample from",
    ),
    limit: int = Query(5, ge=1, le=20, description="Number of results"),
) -> ImageSearchResponse:
    """
    Get random featured images from Wikimedia Commons.

    Useful for inspiration or when no specific query is provided.
    """
    params = {
        "action": "query",
        "generator": "categorymembers",
        "gcmtitle": f"Category:{category}",
        "gcmtype": "file",
        "gcmlimit": str(limit),
        "gcmsort": "timestamp",  # Random-ish by recent additions
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "iiurlwidth": "400",
        "format": "json",
        "origin": "*",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                WIKIMEDIA_API_URL,
                params=params,
                headers={"User-Agent": "Ephemeral Canvas/1.0"},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Wikimedia API error: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch images: {e}")

    # Parse results (same as search)
    results: list[ImageResult] = []
    pages = data.get("query", {}).get("pages", {})

    for page in pages.values():
        imageinfo = page.get("imageinfo", [{}])[0]
        if not imageinfo:
            continue

        url = imageinfo.get("url", "")
        thumbnail = imageinfo.get("thumburl", url)
        extmetadata = imageinfo.get("extmetadata", {})
        description = extmetadata.get("ImageDescription", {}).get("value", "")
        artist = extmetadata.get("Artist", {}).get("value", "")

        if description:
            description = re.sub(r"<[^>]+>", "", description)[:200]
        if artist:
            artist = re.sub(r"<[^>]+>", "", artist)

        results.append(
            ImageResult(
                url=url,
                thumbnail=thumbnail,
                title=page.get("title", "").replace("File:", ""),
                description=description or None,
                attribution=artist or None,
            )
        )

    return ImageSearchResponse(results=results, query=category)
