"""
Playwright test to compare GenerativeGallery vs ConsumerGallery behavior and appearance.
Tests: dragging, tags/badges, product hover display.
"""

import os
from playwright.sync_api import sync_playwright, expect

HEADED = os.getenv('HEADED') == '1'

def test_consumer_gallery():
    """Test ConsumerGallery - the reference implementation."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not HEADED)
        context = browser.new_context()
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()

        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        try:
            # Navigate to consumer gallery
            page.goto('http://localhost:5173/consumer')
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)  # Wait for cards to render

            # Screenshot initial state
            page.screenshot(path='/tmp/consumer_gallery_initial.png', full_page=False)

            # Check for cards
            cards = page.locator('.gallery-card').all()
            print(f"ConsumerGallery: Found {len(cards)} cards")

            if len(cards) == 0:
                print("ERROR: No cards found in ConsumerGallery")
                return

            # Check for any scene badges (should NOT exist in ConsumerGallery)
            scene_badges = page.locator('.scene-badge').count()
            scene_info = page.locator('.scene-info-overlay').count()
            like_buttons = page.locator('.like-button').count()
            print(f"ConsumerGallery - Scene badges: {scene_badges}, Scene info overlays: {scene_info}, Like buttons: {like_buttons}")

            # Test drag functionality on first card
            first_card = cards[0]
            card_box = first_card.bounding_box()
            print(f"First card position: x={card_box['x']}, y={card_box['y']}")

            # Drag the card
            page.mouse.move(card_box['x'] + card_box['width']/2, card_box['y'] + card_box['height']/2)
            page.mouse.down()
            page.mouse.move(card_box['x'] + 100, card_box['y'] + 50, steps=10)
            page.mouse.up()

            page.wait_for_timeout(500)
            new_box = first_card.bounding_box()
            print(f"After drag: x={new_box['x']}, y={new_box['y']}")

            drag_worked = abs(new_box['x'] - card_box['x']) > 20 or abs(new_box['y'] - card_box['y']) > 20
            print(f"ConsumerGallery drag working: {drag_worked}")

            # Test hover on card
            page.mouse.move(card_box['x'] + card_box['width']/2, card_box['y'] + card_box['height']/2)
            page.wait_for_timeout(500)
            page.screenshot(path='/tmp/consumer_gallery_hover.png', full_page=False)

            context.tracing.stop(path='/tmp/trace_consumer_gallery.zip')
            print("ConsumerGallery test complete. Trace saved to /tmp/trace_consumer_gallery.zip")

        except Exception as e:
            context.tracing.stop(path='/tmp/trace_consumer_gallery_FAILED.zip')
            print(f"ConsumerGallery test failed: {e}")
            print(f"Console logs: {logs[-10:]}")
        finally:
            browser.close()


def test_generative_gallery():
    """Test GenerativeGallery - should match ConsumerGallery behavior."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not HEADED)
        context = browser.new_context()
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()

        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        try:
            # Navigate to generative gallery
            page.goto('http://localhost:5173/gallery')
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(3000)  # Wait longer for cards + potential API calls

            # Screenshot initial state
            page.screenshot(path='/tmp/generative_gallery_initial.png', full_page=False)

            # Check for cards (exclude skeleton cards)
            all_cards = page.locator('.gallery-card').all()
            skeleton_cards = page.locator('.skeleton-card').count()
            real_cards = len(all_cards) - skeleton_cards
            print(f"GenerativeGallery: Found {len(all_cards)} cards ({real_cards} real, {skeleton_cards} skeleton)")

            if real_cards == 0:
                print("WARNING: No real cards found, only skeletons")

            # Check for scene badges (should NOT exist to match ConsumerGallery)
            scene_badges = page.locator('.scene-badge').count()
            scene_info = page.locator('.scene-info-overlay').count()
            like_buttons = page.locator('.like-button').count()
            print(f"GenerativeGallery - Scene badges: {scene_badges}, Scene info overlays: {scene_info}, Like buttons: {like_buttons}")

            if scene_badges > 0:
                print("ISSUE: GenerativeGallery has scene badges (ConsumerGallery doesn't)")
            if scene_info > 0:
                print("ISSUE: GenerativeGallery has scene-info-overlay (ConsumerGallery doesn't)")
            if like_buttons > 0:
                print("ISSUE: GenerativeGallery has like buttons (ConsumerGallery doesn't)")

            # Find first non-skeleton card
            non_skeleton = page.locator('.gallery-card:not(.skeleton-card)').first
            if non_skeleton.count() == 0:
                print("No non-skeleton cards to test")
                return

            card_box = non_skeleton.bounding_box()
            if not card_box:
                print("Could not get card bounding box")
                return

            print(f"First real card position: x={card_box['x']}, y={card_box['y']}")

            # Test drag functionality
            page.mouse.move(card_box['x'] + card_box['width']/2, card_box['y'] + card_box['height']/2)
            page.mouse.down()
            page.mouse.move(card_box['x'] + 100, card_box['y'] + 50, steps=10)
            page.mouse.up()

            page.wait_for_timeout(500)
            new_box = non_skeleton.bounding_box()
            print(f"After drag: x={new_box['x']}, y={new_box['y']}")

            drag_worked = abs(new_box['x'] - card_box['x']) > 20 or abs(new_box['y'] - card_box['y']) > 20
            print(f"GenerativeGallery drag working: {drag_worked}")

            if not drag_worked:
                print("ISSUE: Drag not working in GenerativeGallery")

            # Test hover on card - check if scene-info-overlay appears
            page.mouse.move(card_box['x'] + card_box['width']/2, card_box['y'] + card_box['height']/2)
            page.wait_for_timeout(800)
            page.screenshot(path='/tmp/generative_gallery_hover.png', full_page=False)

            # Check for overlays that appear on hover
            scene_info_visible = page.locator('.scene-info-overlay').count()
            print(f"Scene info overlays visible after hover: {scene_info_visible}")

            # Double click to expand and check expanded state
            non_skeleton.dblclick()
            page.wait_for_timeout(500)
            page.screenshot(path='/tmp/generative_gallery_expanded.png', full_page=False)

            # Check expanded card for scene badges
            expanded_scene_badge = page.locator('.expanded-card .scene-badge').count()
            print(f"Expanded card scene badges: {expanded_scene_badge}")

            if expanded_scene_badge > 0:
                print("ISSUE: Expanded card has scene badge (ConsumerGallery doesn't)")

            context.tracing.stop(path='/tmp/trace_generative_gallery.zip')
            print("GenerativeGallery test complete. Trace saved to /tmp/trace_generative_gallery.zip")

        except Exception as e:
            context.tracing.stop(path='/tmp/trace_generative_gallery_FAILED.zip')
            print(f"GenerativeGallery test failed: {e}")
            print(f"Console logs: {logs[-10:]}")
        finally:
            browser.close()


if __name__ == '__main__':
    print("=" * 60)
    print("Testing ConsumerGallery (reference implementation)")
    print("=" * 60)
    test_consumer_gallery()

    print("\n" + "=" * 60)
    print("Testing GenerativeGallery (should match ConsumerGallery)")
    print("=" * 60)
    test_generative_gallery()
