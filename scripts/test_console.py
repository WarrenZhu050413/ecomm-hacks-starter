"""Test the Product Placement Console."""

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
        print("Navigating to console...")
        page.goto('http://localhost:5175/console')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        page.screenshot(path='/tmp/console_initial.png', full_page=True)
        print("Initial screenshot: /tmp/console_initial.png")

        # Check for presets
        presets = page.locator('.pp-preset-apply').all()
        print(f"Presets found: {len(presets)}")

        # Click edit button on first preset
        print("\nTesting preset editing...")
        edit_btn = page.locator('.pp-preset-edit-btn').first
        edit_btn.click()
        page.wait_for_timeout(300)

        # Check if edit form appeared
        edit_form = page.locator('.pp-preset-edit')
        print(f"Edit form visible: {edit_form.is_visible()}")

        page.screenshot(path='/tmp/console_editing.png', full_page=True)
        print("Editing screenshot: /tmp/console_editing.png")

        # Cancel edit
        page.locator('.pp-cancel').click()
        page.wait_for_timeout(200)

        # Select some products and aesthetics
        print("\nSelecting items...")
        for i in range(2):
            page.locator('.pp-products-grid .pp-card').nth(i).click()
            page.wait_for_timeout(100)

        for i in range(2):
            page.locator('.pp-aesthetics-grid .pp-card').nth(i).click()
            page.wait_for_timeout(100)

        # Check combination count
        summary = page.locator('.pp-summary').text_content()
        print(f"Summary: {summary}")

        # Apply a preset
        print("\nApplying preset...")
        page.locator('.pp-preset-apply:has-text("On table")').click()
        page.wait_for_timeout(200)

        # Check if prompt was applied
        prompt_value = page.locator('.pp-prompt-section textarea').input_value()
        print(f"Prompt applied: {prompt_value[:50]}...")

        page.screenshot(path='/tmp/console_ready.png', full_page=True)
        print("\nReady screenshot: /tmp/console_ready.png")

        context.tracing.stop(path="/tmp/trace_console_SUCCESS.zip")
        print("\nTest passed!")
        print("View trace: playwright show-trace /tmp/trace_console_SUCCESS.zip")

    except Exception as e:
        context.tracing.stop(path="/tmp/trace_console_FAILED.zip")
        print(f"\nTest failed: {e}")
        print("\nConsole logs:")
        for log in logs[-20:]:
            print(f"  {log}")
        raise
    finally:
        browser.close()
