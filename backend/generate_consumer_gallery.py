#!/usr/bin/env python3
"""
Generate product-integrated scenes for consumer gallery.

This script:
1. Downloads scene images (cozy cafes, restaurants, urban streets)
2. Downloads product images (luxury bags, backpacks, shoes)
3. Uses Nano Banana to place product into scene
4. Generates mask for hover detection
5. Saves to public/gallery/ for use by frontend
"""

import asyncio
import os
import json
from pathlib import Path
from typing import NamedTuple

from dotenv import load_dotenv
load_dotenv()

import httpx
from google import genai
from google.genai import types
from PIL import Image
import io


class SceneProduct(NamedTuple):
    """A scene + product combination to generate."""
    scene_url: str
    scene_description: str
    product_url: str
    product_name: str
    product_brand: str
    product_price: int
    product_description: str
    placement_hint: str  # Where to place the product in the scene


# Scene + Product combinations
COMBINATIONS = [
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200",
        scene_description="cozy cafe interior with wooden tables",
        product_url="https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600",
        product_name="Neverfull MM",
        product_brand="Louis Vuitton",
        product_price=2030,
        product_description="Iconic tote in Monogram canvas",
        placement_hint="on one of the wooden cafe tables",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",
        scene_description="elegant restaurant with outdoor terrace seating",
        product_url="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
        product_name="GG Marmont",
        product_brand="Gucci",
        product_price=2350,
        product_description="Matelassé leather shoulder bag",
        placement_hint="on one of the restaurant chairs",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1511081692775-05d0f180a065?w=1200",
        scene_description="cozy European cobblestone street with cafe",
        product_url="https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600",
        product_name="Classic Flap",
        product_brand="Chanel",
        product_price=8200,
        product_description="Lambskin with gold chain",
        placement_hint="on a small bistro table",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1200",
        scene_description="sunny outdoor cafe with plants",
        product_url="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
        product_name="Galleria Saffiano",
        product_brand="Prada",
        product_price=3200,
        product_description="Saffiano leather tote",
        placement_hint="beside a potted plant on a table",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200",
        scene_description="modern minimalist cafe interior",
        product_url="https://images.unsplash.com/photo-1575032617751-6ddec2089882?w=600",
        product_name="Loulou Medium",
        product_brand="Saint Laurent",
        product_price=2590,
        product_description="Y-quilted leather bag",
        placement_hint="on the counter or bench",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200",
        scene_description="Parisian sidewalk cafe with bistro chairs",
        product_url="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600",
        product_name="Triomphe Bag",
        product_brand="Celine",
        product_price=2950,
        product_description="Shiny calfskin with clasp",
        placement_hint="on one of the metal bistro chairs",
    ),
    # --- New combinations ---
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200",
        scene_description="vintage bookshop coffee corner with wooden shelves",
        product_url="https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600",
        product_name="Le Pliage",
        product_brand="Longchamp",
        product_price=145,
        product_description="Iconic foldable nylon tote",
        placement_hint="on a small reading table near the books",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200",
        scene_description="cozy window seat in artisan coffee shop",
        product_url="https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=600",
        product_name="Puzzle Bag",
        product_brand="Loewe",
        product_price=3650,
        product_description="Geometric calfskin panels",
        placement_hint="on the cushioned window seat",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=1200",
        scene_description="rooftop terrace bar at sunset",
        product_url="https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600",
        product_name="Dionysus",
        product_brand="Gucci",
        product_price=2980,
        product_description="Tiger head closure bag",
        placement_hint="on the lounge chair by the railing",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200",
        scene_description="rustic Italian restaurant with exposed brick",
        product_url="https://images.unsplash.com/photo-1614179689702-355944cd0918?w=600",
        product_name="Peekaboo ISeeU",
        product_brand="Fendi",
        product_price=4200,
        product_description="Iconic twist-lock bag",
        placement_hint="on one of the dining chairs",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=1200",
        scene_description="trendy urban street with outdoor seating",
        product_url="https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600",
        product_name="Speedy Bandouliere",
        product_brand="Louis Vuitton",
        product_price=1640,
        product_description="Iconic Monogram Boston bag",
        placement_hint="on a street-side cafe table",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1485182708500-e8f1f318ba72?w=1200",
        scene_description="elegant hotel lobby lounge",
        product_url="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
        product_name="Lady Dior",
        product_brand="Dior",
        product_price=5500,
        product_description="Cannage-stitched lambskin",
        placement_hint="on the velvet armchair",
    ),
    SceneProduct(
        scene_url="https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200",
        scene_description="beachside cafe with palm trees",
        product_url="https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=600",
        product_name="Cabas Phantom",
        product_brand="Celine",
        product_price=2100,
        product_description="Soft grained calfskin tote",
        placement_hint="on the wicker chair",
    ),
]


async def download_image(url: str) -> bytes:
    """Download image from URL."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code != 200:
            raise Exception(f"Failed to download {url}: {resp.status_code}")
        return resp.content


def detect_mime_type(data: bytes) -> str:
    """Detect image MIME type from magic bytes."""
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    elif data[:2] == b'\xff\xd8':
        return "image/jpeg"
    elif data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return "image/webp"
    return "image/jpeg"  # fallback


async def generate_integrated_scene(
    client: genai.Client,
    scene_bytes: bytes,
    product_bytes: bytes,
    combo: SceneProduct,
    output_dir: Path,
    index: int
) -> dict | None:
    """Generate an integrated scene with product placed via Nano Banana."""

    scene_mime = detect_mime_type(scene_bytes)
    product_mime = detect_mime_type(product_bytes)

    # Step 1: Place product into scene
    print(f"\n[{index}] Placing {combo.product_brand} {combo.product_name} into {combo.scene_description}...")

    edit_prompt = f"""I am providing two images:
1. FIRST IMAGE: A {combo.product_brand} {combo.product_name} luxury bag (the PRODUCT to place)
2. SECOND IMAGE: A {combo.scene_description} (the BACKGROUND scene)

YOUR TASK: Edit the SECOND image (scene) to ADD the bag from the FIRST image.
Place the bag naturally {combo.placement_hint}.
The bag should be clearly visible, properly lit to match the scene, and look like it belongs there.
Keep the rest of the scene intact - only add the bag.
Output the edited scene with the bag placed in it."""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=edit_prompt),
                        types.Part.from_bytes(data=product_bytes, mime_type=product_mime),
                        types.Part.from_bytes(data=scene_bytes, mime_type=scene_mime),
                    ],
                )
            ],
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
    except Exception as e:
        print(f"  Error generating scene: {e}")
        return None

    integrated_bytes = None
    if response.candidates and response.candidates[0].content:
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                integrated_bytes = part.inline_data.data
                break

    if not integrated_bytes:
        print(f"  ERROR: No integrated image generated!")
        return None

    # Save integrated scene
    scene_path = output_dir / f"scene_{index}.png"
    with open(scene_path, "wb") as f:
        f.write(integrated_bytes)
    print(f"  Saved integrated scene: {scene_path}")

    # Step 2: Generate mask
    print(f"  Generating mask...")

    mask_prompt = f"""Look at this image. There is a {combo.product_brand} luxury bag placed in the scene.

YOUR TASK: Create a SEGMENTATION image where:
- Paint the BAG area in PURE BRIGHT RED (#FF0000)
- Convert EVERYTHING ELSE to GRAYSCALE (black and white)

The bag should be solid bright red, clearly visible against the grayscale background.
This will be used for hover detection on a website."""

    try:
        mask_response = await client.aio.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=mask_prompt),
                        types.Part.from_bytes(data=integrated_bytes, mime_type="image/png"),
                    ],
                )
            ],
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
    except Exception as e:
        print(f"  Error generating mask: {e}")
        return None

    raw_mask_bytes = None
    if mask_response.candidates and mask_response.candidates[0].content:
        for part in mask_response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                raw_mask_bytes = part.inline_data.data
                break

    if not raw_mask_bytes:
        print(f"  ERROR: No mask generated!")
        return None

    # Post-process mask (extract red channel)
    raw_img = Image.open(io.BytesIO(raw_mask_bytes)).convert('RGB')
    width, height = raw_img.size
    pixels = raw_img.load()
    mask_img = Image.new('RGB', (width, height), (0, 0, 0))
    mask_pixels = mask_img.load()

    red_pixel_count = 0
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            if r > 150 and r > g + 30 and r > b + 30:
                mask_pixels[x, y] = (255, 255, 255)
                red_pixel_count += 1

    mask_path = output_dir / f"mask_{index}.png"
    mask_img.save(mask_path)
    print(f"  Saved mask: {mask_path} ({100*red_pixel_count/(width*height):.1f}% coverage)")

    # Also save product image for the overlay
    product_path = output_dir / f"product_{index}.jpg"
    with open(product_path, "wb") as f:
        f.write(product_bytes)

    return {
        "id": f"gallery-{index}",
        "sceneUrl": f"/gallery/scene_{index}.png",
        "maskUrl": f"/gallery/mask_{index}.png",
        "productImageUrl": f"/gallery/product_{index}.jpg",
        "product": {
            "id": f"product-{index}",
            "name": combo.product_name,
            "brand": combo.product_brand,
            "price": combo.product_price,
            "currency": "USD",
            "description": combo.product_description,
        }
    }


async def main():
    """Main entry point."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set!")
        return

    print(f"API Key: {api_key[:10]}...")
    client = genai.Client(api_key=api_key)

    # Output directory in public folder
    output_dir = Path(__file__).parent.parent / "public" / "gallery"
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}")

    results = []

    # Only generate new ones (starting from index 6)
    start_index = 6
    combinations_to_generate = list(enumerate(COMBINATIONS))[start_index:]

    for i, combo in combinations_to_generate:
        print(f"\n{'='*60}")
        print(f"Processing {i+1}/{len(COMBINATIONS)}: {combo.product_brand} {combo.product_name}")
        print(f"{'='*60}")

        try:
            # Download images
            print(f"Downloading scene: {combo.scene_description}...")
            scene_bytes = await download_image(combo.scene_url)
            print(f"  Scene: {len(scene_bytes)} bytes")

            print(f"Downloading product: {combo.product_name}...")
            product_bytes = await download_image(combo.product_url)
            print(f"  Product: {len(product_bytes)} bytes")

            # Generate integrated scene + mask
            result = await generate_integrated_scene(
                client, scene_bytes, product_bytes, combo, output_dir, i
            )

            if result:
                results.append(result)
                print(f"  SUCCESS!")
            else:
                print(f"  FAILED - skipping")

            # Rate limiting
            await asyncio.sleep(2)

        except Exception as e:
            print(f"  ERROR: {e}")
            continue

    # Load existing manifest and merge
    manifest_path = output_dir / "manifest.json"
    existing_results = []
    if manifest_path.exists():
        with open(manifest_path, "r") as f:
            existing_results = json.load(f)
        print(f"\nLoaded {len(existing_results)} existing items from manifest")

    # Merge: keep existing items, add new ones (by id)
    existing_ids = {r["id"] for r in existing_results}
    for result in results:
        if result["id"] not in existing_ids:
            existing_results.append(result)

    # Sort by id
    existing_results.sort(key=lambda x: int(x["id"].split("-")[1]))

    with open(manifest_path, "w") as f:
        json.dump(existing_results, f, indent=2)
    print(f"\n\nSaved manifest: {manifest_path}")
    print(f"Total items in manifest: {len(existing_results)}")
    print(f"Successfully generated {len(results)} new scenes")


if __name__ == "__main__":
    asyncio.run(main())
