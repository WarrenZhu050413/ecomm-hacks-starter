"""
Simple test to check GenerativeGallery state.
"""

import os
from playwright.sync_api import sync_playwright

HEADED = os.getenv('HEADED') == '1'

def test_generative_gallery():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not HEADED)
        page = browser.new_page()

        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        # Navigate to generative gallery
        page.goto('http://localhost:5173/gallery', timeout=60000)
        print("Navigated to /gallery")

        # Wait for page to be loaded
        page.wait_for_load_state('domcontentloaded')
        print("DOM content loaded")

        # Take screenshot before waiting for cards
        page.screenshot(path='/tmp/generative_initial.png')
        print("Initial screenshot saved")

        # Check what's on the page
        page.wait_for_timeout(3000)

        # Check for gallery container
        gallery_container = page.locator('.gallery-container')
        print(f"Gallery container count: {gallery_container.count()}")

        # Check for various card types
        all_cards = page.locator('.gallery-card')
        skeleton_cards = page.locator('.skeleton-card')
        real_cards = page.locator('.gallery-card:not(.skeleton-card)')

        print(f"All cards: {all_cards.count()}")
        print(f"Skeleton cards: {skeleton_cards.count()}")
        print(f"Real cards: {real_cards.count()}")

        # Check for extra UI elements
        scene_badges = page.locator('.scene-badge')
        scene_info = page.locator('.scene-info-overlay')
        like_buttons = page.locator('.like-button')
        generation_indicator = page.locator('.generation-indicator')

        print(f"Scene badges: {scene_badges.count()}")
        print(f"Scene info overlays: {scene_info.count()}")
        print(f"Like buttons: {like_buttons.count()}")
        print(f"Generation indicator: {generation_indicator.count()}")

        # Take screenshot after waiting
        page.screenshot(path='/tmp/generative_after_wait.png')
        print("Screenshot after wait saved")

        # Test drag on first real card if available
        if real_cards.count() > 0:
            first_card = real_cards.first
            box = first_card.bounding_box()
            if box:
                print(f"First real card position: x={box['x']:.1f}, y={box['y']:.1f}")

                # Try dragging
                page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2)
                page.mouse.down()
                page.mouse.move(box['x'] + 80, box['y'] + 30, steps=5)
                page.mouse.up()

                page.wait_for_timeout(500)
                new_box = first_card.bounding_box()
                if new_box:
                    dx = new_box['x'] - box['x']
                    dy = new_box['y'] - box['y']
                    print(f"After drag: moved dx={dx:.1f}, dy={dy:.1f}")
                    print(f"Drag working: {abs(dx) > 10 or abs(dy) > 10}")

            # Hover on card and check for overlays appearing
            first_card.hover()
            page.wait_for_timeout(500)
            scene_info_after_hover = page.locator('.scene-info-overlay').count()
            like_buttons_after_hover = page.locator('.like-button').count()
            print(f"After hover - Scene info: {scene_info_after_hover}, Like buttons: {like_buttons_after_hover}")

            page.screenshot(path='/tmp/generative_hover.png')
            print("Hover screenshot saved")

        # Print last 5 console logs
        print(f"\nConsole logs (last 5):")
        for log in logs[-5:]:
            print(f"  {log}")

        browser.close()


if __name__ == '__main__':
    test_generative_gallery()
