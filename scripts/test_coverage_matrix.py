"""Test the Coverage Matrix view."""

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
        page.wait_for_timeout(1000)

        page.screenshot(path='/tmp/coverage_1_initial.png', full_page=True)
        print("1. Initial console view: /tmp/coverage_1_initial.png")

        # Click on Coverage Matrix tab
        print("\nClicking Coverage Matrix tab...")
        page.locator('.pp-view-toggle button:has-text("Coverage Matrix")').click()
        page.wait_for_timeout(500)

        page.screenshot(path='/tmp/coverage_2_matrix.png', full_page=True)
        print("2. Coverage Matrix view: /tmp/coverage_2_matrix.png")

        # Check for matrix grid
        grid = page.locator('.cm-grid')
        print(f"Matrix grid found: {grid.is_visible()}")

        # Check for cells
        cells = page.locator('.cm-cell').all()
        print(f"Total cells in matrix: {len(cells)}")

        # Check for product headers
        product_headers = page.locator('.cm-product-header').all()
        print(f"Product rows: {len(product_headers)}")

        # Check for aesthetic headers
        aesthetic_headers = page.locator('.cm-aesthetic-header').all()
        print(f"Aesthetic columns: {len(aesthetic_headers)}")

        # Check stats
        stats = page.locator('.cm-stats').text_content()
        print(f"Stats: {stats}")

        # Check for faded cells (ungenerated)
        faded_cells = page.locator('.cm-cell.not-cached').all()
        print(f"Ungenerated cells (faded): {len(faded_cells)}")

        # Check for cached cells (generated)
        cached_cells = page.locator('.cm-cell.cached').all()
        print(f"Generated cells (cached): {len(cached_cells)}")

        # Try clicking on a cell to see if generate triggers
        print("\nClicking first ungenerated cell...")
        first_faded = page.locator('.cm-cell.not-cached').first
        if first_faded.is_visible():
            first_faded.click()
            page.wait_for_timeout(500)
            page.screenshot(path='/tmp/coverage_3_cell_clicked.png', full_page=True)
            print("3. After cell click: /tmp/coverage_3_cell_clicked.png")

            # Check if generating
            generating = page.locator('.cm-cell.generating').all()
            print(f"Cells generating: {len(generating)}")

        # Go back to select view
        print("\nSwitching back to Select view...")
        page.locator('.pp-view-toggle button:has-text("Select")').click()
        page.wait_for_timeout(300)

        page.screenshot(path='/tmp/coverage_4_back_to_select.png', full_page=True)
        print("4. Back to Select: /tmp/coverage_4_back_to_select.png")

        context.tracing.stop(path="/tmp/trace_coverage_SUCCESS.zip")
        print("\n✓ Test passed!")
        print("View trace: playwright show-trace /tmp/trace_coverage_SUCCESS.zip")

    except Exception as e:
        context.tracing.stop(path="/tmp/trace_coverage_FAILED.zip")
        print(f"\n✗ Test failed: {e}")
        print("\nConsole logs:")
        for log in logs[-20:]:
            print(f"  {log}")
        raise
    finally:
        browser.close()
