"""Debug script to investigate GenerativeGallery card visibility bug."""
import time
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        context.tracing.start(screenshots=True, snapshots=True, sources=True)

        logs = []
        page = context.new_page()
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        print("Navigating to /gallery...")
        page.goto('http://localhost:5173/gallery', wait_until='domcontentloaded')

        # Wait for initial render
        time.sleep(2)

        # Take initial screenshot
        page.screenshot(path='/tmp/gallery_initial.png', full_page=True)
        print("Screenshot saved: /tmp/gallery_initial.png")

        # Find all gallery cards
        cards = page.locator('.gallery-card').all()
        print(f"\nFound {len(cards)} gallery cards")

        # Check each card's visibility
        for i, card in enumerate(cards[:10]):  # Check first 10
            try:
                is_visible = card.is_visible()
                bbox = card.bounding_box() if is_visible else None

                # Get computed styles
                styles = card.evaluate("""el => {
                    const computed = window.getComputedStyle(el);
                    return {
                        opacity: computed.opacity,
                        visibility: computed.visibility,
                        display: computed.display,
                        transform: computed.transform,
                        position: computed.position,
                        left: computed.left,
                        top: computed.top,
                        width: computed.width,
                        height: computed.height,
                        zIndex: computed.zIndex,
                        maskImage: computed.maskImage || computed.webkitMaskImage
                    }
                }""")

                # Get inline styles
                inline_styles = card.evaluate("""el => {
                    return {
                        opacity: el.style.opacity,
                        left: el.style.left,
                        top: el.style.top,
                        width: el.style.width,
                        height: el.style.height,
                        transform: el.style.transform
                    }
                }""")

                print(f"\nCard {i}:")
                print(f"  Visible: {is_visible}")
                print(f"  BBox: {bbox}")
                print(f"  Computed opacity: {styles['opacity']}")
                print(f"  Inline opacity: {inline_styles['opacity']}")
                print(f"  Visibility: {styles['visibility']}")
                print(f"  Display: {styles['display']}")
                print(f"  Position: {styles['position']}")
                print(f"  Left: {inline_styles['left']} / computed: {styles['left']}")
                print(f"  Top: {inline_styles['top']} / computed: {styles['top']}")
                print(f"  Size: {inline_styles['width']}x{inline_styles['height']}")
                print(f"  Transform: {inline_styles['transform']}")
                print(f"  Mask: {styles['maskImage'][:50] if styles['maskImage'] else 'none'}...")

            except Exception as e:
                print(f"\nCard {i}: Error - {e}")

        # Check for images inside cards
        print("\n\n=== Checking Images ===")
        images = page.locator('.gallery-card img').all()
        print(f"Found {len(images)} images in cards")

        for i, img in enumerate(images[:10]):
            try:
                src = img.get_attribute('src')
                is_visible = img.is_visible()
                bbox = img.bounding_box() if is_visible else None
                natural_size = img.evaluate("el => ({ width: el.naturalWidth, height: el.naturalHeight })")

                print(f"\nImage {i}:")
                print(f"  Visible: {is_visible}")
                print(f"  BBox: {bbox}")
                print(f"  Natural size: {natural_size}")
                print(f"  Src: {src[:80] if src else 'None'}...")

            except Exception as e:
                print(f"\nImage {i}: Error - {e}")

        # Wait a bit more to see if opacity changes
        print("\n\n=== Waiting 3 more seconds for fade-in... ===")
        time.sleep(3)

        # Check again
        cards = page.locator('.gallery-card').all()
        print(f"\nAfter wait: {len(cards)} gallery cards")

        for i, card in enumerate(cards[:5]):
            try:
                styles = card.evaluate("""el => {
                    const computed = window.getComputedStyle(el);
                    return {
                        opacity: computed.opacity,
                        inlineOpacity: el.style.opacity
                    }
                }""")
                print(f"Card {i}: computed opacity={styles['opacity']}, inline opacity={styles['inlineOpacity']}")
            except Exception as e:
                print(f"Card {i}: Error - {e}")

        # Take screenshot after wait
        page.screenshot(path='/tmp/gallery_after_wait.png', full_page=True)
        print("\nScreenshot saved: /tmp/gallery_after_wait.png")

        # Print console logs
        print("\n\n=== Console Logs ===")
        for log in logs[-30:]:
            print(f"  {log}")

        # Save trace
        context.tracing.stop(path="/tmp/gallery_debug_trace.zip")
        print("\nTrace saved: /tmp/gallery_debug_trace.zip")
        print("View with: npx playwright show-trace /tmp/gallery_debug_trace.zip")

        browser.close()

if __name__ == "__main__":
    main()
