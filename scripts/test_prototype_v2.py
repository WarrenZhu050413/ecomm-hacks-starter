"""Test the Paris Drafting Table V2 - Matrix Prototype."""

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
        print("Navigating to V2 prototype...")
        page.goto('http://localhost:5175/prototype/v2')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        # Screenshot initial state
        page.screenshot(path='/tmp/prototype_v2_initial.png', full_page=True)
        print("Initial screenshot: /tmp/prototype_v2_initial.png")

        # Check elements
        product_cards = page.locator('.card-v2').all()
        print(f"Total cards found: {len(product_cards)}")

        # Select first 3 products
        print("\nSelecting 3 products...")
        for i in range(3):
            page.locator('.products-grid .card-v2').nth(i).click()
            page.wait_for_timeout(200)

        # Select first 2 aesthetics
        print("Selecting 2 aesthetics...")
        for i in range(2):
            page.locator('.aesthetics-grid .card-v2').nth(i).click()
            page.wait_for_timeout(200)

        # Check combination count
        combo_text = page.locator('.combo-count').text_content()
        print(f"Combination count: {combo_text}")

        # Screenshot with selections
        page.screenshot(path='/tmp/prototype_v2_selected.png', full_page=True)
        print("Selection screenshot: /tmp/prototype_v2_selected.png")

        # Click a preset button
        print("\nClicking preset 'On table'...")
        page.locator('.preset-btn:has-text("On table")').click()
        page.wait_for_timeout(300)

        # Check if textarea has preset value
        textarea_value = page.locator('.prompt-area textarea').input_value()
        print(f"Preset applied: {textarea_value[:50]}...")

        # Check generate button
        generate_btn = page.locator('.generate-matrix-btn')
        btn_text = generate_btn.text_content()
        is_enabled = not generate_btn.is_disabled()
        print(f"Generate button: '{btn_text}' (enabled: {is_enabled})")

        # Final screenshot
        page.screenshot(path='/tmp/prototype_v2_ready.png', full_page=True)
        print("\nReady screenshot: /tmp/prototype_v2_ready.png")

        context.tracing.stop(path="/tmp/trace_v2_SUCCESS.zip")
        print("\nTest passed!")
        print("View trace: playwright show-trace /tmp/trace_v2_SUCCESS.zip")

    except Exception as e:
        context.tracing.stop(path="/tmp/trace_v2_FAILED.zip")
        print(f"\nTest failed: {e}")
        print("\nConsole logs:")
        for log in logs[-20:]:
            print(f"  {log}")
        raise
    finally:
        browser.close()
