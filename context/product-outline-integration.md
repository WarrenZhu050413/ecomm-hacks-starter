# Product Outline Integration

Hover-to-reveal product discovery feature using Nano Banana (Gemini 2.5 Flash Image) for AI-powered product placement and mask generation.

## Overview

This feature enables seamless product discovery in lifestyle images:
1. A product image is composited into a scene using AI
2. A segmentation mask is generated to identify the product's exact location
3. On hover (800ms delay), a subtle highlight appears on the product and a purchase card is shown

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Product Image  │────▶│                 │
└─────────────────┘     │   Nano Banana   │────▶ Integrated Scene
┌─────────────────┐     │   (Gemini 2.5   │
│ Background Scene│────▶│   Flash Image)  │────▶ Product Mask
└─────────────────┘     └─────────────────┘

Frontend loads both images:
- Scene displayed to user
- Mask loaded into hidden canvas for hit detection
- On mousemove: sample mask pixel → if white, show highlight + card
```

## Code Files

### Backend (Image Generation)

**`/backend/test_product_integration.py`**
- Main script for generating integrated scenes and masks
- Downloads product and background images
- Calls Nano Banana to place product into scene
- Generates mask with red-channel extraction approach:
  1. Ask Nano Banana to paint product RED, rest grayscale
  2. Post-process to extract red pixels as white mask

**`/backend/.env`**
```
GEMINI_API_KEY=<your-key>
GEMINI_MODEL=gemini-2.0-flash
```

**`/backend/test_output/`**
- `product_original.jpg` - Source product image
- `background_original.jpg` - Source scene image
- `integrated_scene.png` - AI-generated composite
- `mask_raw.png` - Raw mask from Nano Banana (red product, grayscale rest)
- `mask.png` - Processed mask (white product, black rest)

### Frontend (Interactive Prototype)

**`/src/prototypes/product-outline-integration/proto-real.html`**
- Main prototype with mask-based hover detection
- Loads mask into hidden canvas
- Samples pixel on mousemove to detect if cursor is over product
- Shows subtle white highlight overlay on product area
- Displays glassmorphic product card to right of cursor

**`/src/prototypes/product-outline-integration/`**
- `integrated_scene.png` - The composite scene (copied from backend output)
- `mask.png` - The processed mask (copied from backend output)
- `product_original.jpg` - Original product for reference
- `background_original.jpg` - Original background for reference

## Key Implementation Details

### Mask Generation (Red-Channel Extraction)

The mask prompt asks Nano Banana to:
- Paint the product in PURE BRIGHT RED (#FF0000)
- Convert everything else to GRAYSCALE

Post-processing in Python extracts red pixels:
```python
if r > 150 and r > g + 30 and r > b + 30:
    mask_pixels[x, y] = (255, 255, 255)  # White
# else: stays black
```

### Hover Detection (Canvas Pixel Sampling)

```javascript
function isMouseOverProduct(x, y) {
    // Map mouse position to mask coordinates
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;
    const maskX = Math.floor((x - rect.left) * scaleX);
    const maskY = Math.floor((y - rect.top) * scaleY);

    // Get pixel brightness
    const pixelIndex = (maskY * maskCanvas.width + maskX) * 4;
    const brightness = (r + g + b) / 3;
    return brightness > 128;
}
```

### Subtle Highlight Effect

Instead of a harsh white overlay, uses very low opacity (alpha=35):
```javascript
imgData.data[i] = 255;     // R
imgData.data[i+1] = 255;   // G
imgData.data[i+2] = 255;   // B
imgData.data[i+3] = 35;    // A - very subtle
```

### Product Card Positioning

Card appears to the RIGHT of cursor, vertically centered:
```javascript
let left = x - rect.left + gap;  // 30px gap
let top = y - rect.top - (cardHeight / 2);

// Flip to left if would overflow
if (left + cardWidth > rect.width) {
    left = x - rect.left - cardWidth - gap;
}
```

## Running the Prototype

1. Generate images (if needed):
   ```bash
   cd backend
   uv run python test_product_integration.py
   ```

2. Copy outputs to prototype:
   ```bash
   cp backend/test_output/{mask.png,integrated_scene.png} \
      src/prototypes/product-outline-integration/
   ```

3. Start server and open:
   ```bash
   cd src/prototypes/product-outline-integration
   python3 -m http.server 8888
   # Open http://localhost:8888/proto-real.html
   ```

## Tech Stack

- **AI Model**: Gemini 2.5 Flash Image (Nano Banana)
- **Backend**: Python, google-genai, httpx, Pillow
- **Frontend**: Vanilla HTML/CSS/JS, Canvas API
- **Styling**: Glassmorphic cards, CSS variables, Crimson Pro + DM Sans fonts
