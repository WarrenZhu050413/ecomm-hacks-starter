#!/usr/bin/env python3
"""Download original scene images (without products) for the gallery."""

import asyncio
from pathlib import Path
import httpx

# Scene URLs matching the order in generate_consumer_gallery.py COMBINATIONS
SCENE_URLS = [
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200",  # 0
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",  # 1
    "https://images.unsplash.com/photo-1511081692775-05d0f180a065?w=1200",  # 2
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1200",  # 3
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200",  # 4
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200",  # 5
    "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200",  # 6
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200",  # 7
    "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=1200",  # 8
    "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200",  # 9
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=1200",  # 10
    "https://images.unsplash.com/photo-1485182708500-e8f1f318ba72?w=1200",  # 11
    "https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200",  # 12
]


async def download_image(url: str, index: int, output_dir: Path) -> bool:
    """Download a single image."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code != 200:
                print(f"  [{index}] FAILED: HTTP {resp.status_code}")
                return False

            output_path = output_dir / f"base_{index}.jpg"
            with open(output_path, "wb") as f:
                f.write(resp.content)
            print(f"  [{index}] Saved: {output_path} ({len(resp.content)} bytes)")
            return True
    except Exception as e:
        print(f"  [{index}] ERROR: {e}")
        return False


async def main():
    output_dir = Path(__file__).parent.parent / "public" / "gallery"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading {len(SCENE_URLS)} base scene images...")
    print(f"Output directory: {output_dir}\n")

    tasks = []
    for i, url in enumerate(SCENE_URLS):
        tasks.append(download_image(url, i, output_dir))

    results = await asyncio.gather(*tasks)

    success_count = sum(results)
    print(f"\nDone! Downloaded {success_count}/{len(SCENE_URLS)} images.")


if __name__ == "__main__":
    asyncio.run(main())
