<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./static/darkmode.png">
  <source media="(prefers-color-scheme: light)" srcset="./static/lightmode.png">
  <img alt="Ecomm Hacks Banner" src="./static/lightmode.png">
</picture>

## Your Submission

### Team Name
Studio Tenwu

### Team Members
- Warren Zhu
- Matt Kotzbauer

### Demo
- **Live URL:** (TODO)
- **Demo Video:** N/A

### What We Built

**Reverie** is an advertising platform that integrates shoppable products into Pinterest-style lifestyle imagery. Instead of interrupting the user's social media experience with separate ad placements, Reverie uses AI to naturally place products into scenes the user is already drawn to, allowing organic product discovery through hover-to-reveal interactions.

### How It Works

1. **AI-Powered Product Placement**: Using Nano Banana Pro, we composite products into curated lifestyle scenes. Nano Banana blends the product into the environment with proper lighting, shadows, and perspective.

2. **Mask-Based Hover Detection**: Nano Banana also generates a segmentation mask that identifies exactly where the product is in the scene. We use red-channel extraction to create a clean binary mask (white for product, black for background).

3. **Natural Product Discovery**: When users hover over a product area (detected with canvas pixel sampling of the mask), a subtle highlight appears and a translucent product card slides in. Users can add the product to their bag or complete a 1-click purchase.

4. **Non-Intrusive UX**: The focus of the UX is that ads don't interrupt the consumption experience, instead being placed in locations that match their aesthetic preferences and incite curiosity.

### Key Features

- **Product insertion into images** - Organic insertions of products into images
- **Gallery scrolling** - Pinterest-style scroll with staggered card layouts
- **Mask-based hover detection** - Detects when user hovers or clicks on the product, showing translucent popup with the purchasing options
- **Writing pane** - Users can describe their mood/vibe to interact with and personalize the feed
- **'Add to Bag' animation** - When added to the user's bag, the product physically fades out from the scene

### Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TipTap (rich text editor)
- **Backend:** FastAPI + Python + uvicorn
- **Models:** Nano Banana Pro for scene generation and mask creation, Gemini 3 Pro for text
- **Styling:** CSS, Playfair Display + Crimson Pro + DM Sans typography
- **Image Processing:** Pillow for mask post-processing (red-channel extraction)

### Setup Instructions

```bash
# Clone the repo
git clone https://github.com/WarrenZhu050413/ecomm-hacks-starter.git
cd ecomm-hacks-starter

# Frontend setup
npm install
npm run dev

# Backend setup (in separate terminal)
cd backend
cp .env.example .env
# Add your GEMINI_API_KEY to .env
uv sync
uv run uvicorn app.main:app --reload

# Generate test images (optional)
cd backend
uv run python test_product_integration.py
```

### Screenshots

*Consumer Gallery View*
- Pinterest-style scrolling gallery with AI-generated lifestyle scenes
- Products naturally integrated into each image
- Hover detection highlights only the product area

*Product Hover Interaction*
- Subtle white highlight on product
- Glassmorphic product card appears to the right
- Brand, name, price, and Buy Now button

*Mask Generation Pipeline*
- Original product + Background scene → Nano Banana → Integrated scene + Product mask

### Challenges We Faced

1. **Getting precise masks from Nano Banana**: The model doesn't natively output segmentation masks. We solved this by prompting it to paint the product RED and everything else grayscale, then post-processing to extract red pixels as a binary mask.

2. **Object-fit: cover misalignment**: When the scene image is cropped via CSS `object-fit: cover`, the mask coordinates don't match the displayed image. We calculate the crop offset to properly map mouse coordinates to mask pixels.

3. **Hover state management**: Balancing hover-triggered popups with click-to-lock behavior required careful state management to avoid flickering and premature dismissals.

4. **Model quota issues**: Initial models had quota limits; we switched to `gemini-2.5-flash-image` which worked reliably.

### What's Next

If we had more time, we would:

1. **Build out the social network layer** - The real power of Reverie comes from network effects. With a user base creating and sharing mood boards, we could build a Pinterest-like platform where every image is potentially shoppable, creating a new paradigm for social commerce.

2. **Personalized feed algorithms** - Use the writing pane input and browsing behavior to curate images that match each user's aesthetic preferences.

3. **Advertiser console** - Full dashboard for brands to upload products, select target aesthetics, and track conversion metrics.

4. **Real-time generation** - Stream scene generation so users see products appear in real-time as they describe their mood.

5. **Multi-product scenes** - Support multiple products per image with independent hover zones.

6. **Mobile optimization** - Touch-friendly interactions (long-press instead of hover).
