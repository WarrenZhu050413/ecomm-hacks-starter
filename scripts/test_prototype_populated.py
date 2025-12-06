"""Test the Paris Drafting Table prototype with pre-populated images."""

import os
from playwright.sync_api import sync_playwright

headless = os.getenv('HEADED') != '1'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=headless)
    context = browser.new_context(viewport={'width': 1400, 'height': 900})
    context.tracing.start(screenshots=True, snapshots=True, sources=True)

    logs = []
    page = context.new_page()
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

    try:
        # Navigate to prototype page
        print("Navigating to prototype page...")
        page.goto('http://localhost:5175/prototype')
        page.wait_for_load_state('networkidle')

        # Wait for images to load
        page.wait_for_timeout(2000)

        # Take initial screenshot
        page.screenshot(path='/tmp/prototype_populated.png', full_page=True)
        print("Screenshot saved to /tmp/prototype_populated.png")

        # Check for product images
        product_images = page.locator('.product-card img').all()
        print(f"Product images loaded: {len(product_images)}")

        # Check for aesthetic images
        aesthetic_images = page.locator('.aesthetic-card img').all()
        print(f"Aesthetic images loaded: {len(aesthetic_images)}")

        # Click on first product
        if len(product_images) > 0:
            print("\nSelecting first product...")
            page.locator('.product-card').first.click()
            page.wait_for_timeout(300)

        # Click on first aesthetic
        if len(aesthetic_images) > 0:
            print("Selecting first aesthetic...")
            page.locator('.aesthetic-card').first.click()
            page.wait_for_timeout(300)

        # Take screenshot with selections
        page.screenshot(path='/tmp/prototype_selected.png', full_page=True)
        print("Selection screenshot saved to /tmp/prototype_selected.png")

        # Check that Place Product button is enabled
        place_btn = page.locator('.place-btn')
        is_enabled = not place_btn.is_disabled()
        print(f"\nPlace Product button enabled: {is_enabled}")

        # Save trace
        context.tracing.stop(path="/tmp/trace_prototype_populated_SUCCESS.zip")
        print("\nTest passed!")
        print("View trace: playwright show-trace /tmp/trace_prototype_populated_SUCCESS.zip")

        # Print any errors
        errors = [log for log in logs if 'error' in log.lower()]
        if errors:
            print("\nConsole errors:")
            for err in errors[-10:]:
                print(f"  {err}")

    except Exception as e:
        context.tracing.stop(path="/tmp/trace_prototype_populated_FAILED.zip")
        print(f"\nTest failed: {e}")

        print("\nConsole logs (last 20):")
        for log in logs[-20:]:
            print(f"  {log}")

        raise
    finally:
        browser.close()
