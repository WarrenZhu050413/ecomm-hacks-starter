<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./static/darkmode.png">
  <source media="(prefers-color-scheme: light)" srcset="./static/lightmode.png">
  <img alt="Reverie Banner" src="./static/lightmode.png">
</picture>

---

## Team Name
**Reverie**

## Team Members
- Warren Zhu
- Matthew Kotzbauer

## Demo
- **Live URL:** [TBD]
- **Demo Video:** [TBD]

---

## Philosophy

Most tools optimize for one moment: the scroll, the save, or the sale.

Reverie is the whole journey—from the first spark of "I'm drawn to this" through the quiet work of understanding *why*, to the moment you're ready to bring it home.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   DISCOVERY        REFLECTION        CURATION        PURCHASE              │
│                                                                             │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐          │
│   │ Browse  │  →   │ Write   │  →   │ Save    │  →   │ Buy     │          │
│   │ scenes  │      │ about   │      │ what    │      │ when    │          │
│   │ drift   │      │ what    │      │ resonates│     │ ready   │          │
│   │ past    │      │ draws   │      │         │      │         │          │
│   │         │      │ you     │      │         │      │         │          │
│   └─────────┘      └─────────┘      └─────────┘      └─────────┘          │
│                                                                             │
│   "What catches    "Why do I        "This is me"     "I'm ready           │
│    my eye?"         love this?"                       to own this"         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Write about what catches your eye. Save what resonates. Let the rest fade. When you're ready, the products are there—not pushing, just waiting.

**This is taste as a practice, not a transaction.**

---

## Why We Built This

We built Reverie for ourselves.

We're the people who spend hours on Pinterest not to buy anything, but to understand our own taste. Who keep Notes app dumps of "vibes I'm drawn to." Who journal about why a certain light or texture feels right.

We wanted one place for that whole process—discovery, reflection, curation, and eventually purchase. Something slower than a feed, more visual than a chat, and more intentional than a cart.

We've shown it to friends. They get it too.

---

## Who This Is For

Reverie is for **visual introspectives**—people who:

- Use Pinterest not to buy, but to *understand themselves*
- Keep journals, morning pages, or mood boards for their "future self"
- Want to articulate *why* they're drawn to certain textures, colors, and quiet details
- See curation as a form of self-expression and self-discovery

If you've ever spent an hour browsing not to shop but to figure out your own taste, this is for you.

---

## What We Built

**Reverie** is a curative taste platform that combines:
- **AI-generated aesthetic content** — Fully generative scenes created by Nano Banana Pro
- **Embedded product placement** — Products appear *inside* images, not as overlays
- **A writing pane for self-reflection** — Your notes help the AI understand your taste
- **Slow discovery over doom-scrolling** — Cards drift away unless saved; contemplation over consumption

### The Problem

**1. Pinterest is 50-60% ads.** Users complain that sponsored content drowns out what they came for. The ads take up separate space, making it hard to discern real content from promotion.

**2. Chat-based AI doesn't fit e-commerce.** Conversational UIs feel unnatural for *browsing and discovering*. Shopping is about serendipity and visual inspiration, not Q&A.

**3. Image-based feeds can't capture nuance.** Scroll behavior is low-signal. LLMs need *language* to understand *why* you're drawn to something—not just that you liked it.

### Our Solution

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   ┌──────────────────────┐         ┌──────────────────────────────────┐ │
│   │ Writing Pane         │         │ Ephemeral Canvas                 │ │
│   │                      │         │                                  │ │
│   │ "I keep saving       │         │  ┌────────┐      ┌────────┐     │ │
│   │  images with that    │         │  │        │  ◈   │        │     │ │
│   │  4pm Paris light.    │    +    │  │  ░░░░  │      │  ░░░░  │     │ │
│   │  Something about     │         │  │  ░░░░  │      │  ░░░░  │     │ │
│   │  the quiet before    │         │  └────────┘      └────────┘     │ │
│   │  evening..."         │         │         ↘ cards drift ↙         │ │
│   │                      │         │                                  │ │
│   └──────────┬───────────┘         └────────────────┬─────────────────┘ │
│              │                                      │                    │
│              └──────────────────┬───────────────────┘                    │
│                                 ▼                                        │
│                      ┌─────────────────────┐                             │
│                      │    Gemini 3 Pro     │                             │
│                      │                     │                             │
│                      │  Your writing +     │                             │
│                      │  visible cards =    │                             │
│                      │  deep personalization│                            │
│                      └──────────┬──────────┘                             │
│                                 ▼                                        │
│                    Feed evolves to match                                 │
│                    your articulated taste                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**The key insight:** LLMs need language to understand nuance. "Golden hour Parisian café with worn leather and old books" contains more signal than 1,000 scroll interactions. By combining visual discovery with written reflection, we give the AI—and you—a deeper understanding of your taste.

---

## How It Works

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADVERTISER CONSOLE                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Products │  │ Demo-    │  │ Aesthetic│  │ Budget   │            │
│  │ Catalog  │  │ graphics │  │ Matching │  │ & Deploy │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │   SEMANTIC MATCHING    │
                │  User writing + saves  │
                │  matched to products   │
                └───────────┬────────────┘
                            │
                            ▼
                ┌────────────────────────┐
                │   NANO BANANA PRO      │
                │  AI-generated scenes   │
                │  with native products  │
                └───────────┬────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│  ┌───────────────────┬─────────────────────────────────────────┐   │
│  │  Writing Pane     │  Ephemeral Canvas                       │   │
│  │                   │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │
│  │  "I love the      │  │ ░░░░░░░ │  │ ░░░░░░░ │  │ ░░░░░░░ │ │   │
│  │   texture of      │  │ ░░░▓░░░ │  │ ░░░░░░░ │  │ ░░▓▓░░░ │ │   │
│  │   linen in        │  │ ░░░░░░░ │  │ ░░░░░░░ │  │ ░░░░░░░ │ │   │
│  │   morning         │  └─────────┘  └────┬────┘  └─────────┘ │   │
│  │   light..."       │                    │                    │   │
│  │                   │                    ▼ hover              │   │
│  │  Gemini sees      │              ┌──────────────┐          │   │
│  │  your writing     │              │ HAY Sofa     │          │   │
│  │                   │              │ $3,895       │          │   │
│  │                   │              │ [Add to Bag] │          │   │
│  │                   │              │ ◈ Placed     │ ← disclosure
│  │                   │              └──────────────┘          │   │
│  └───────────────────┴─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Flow:**
1. **Write** — Reflect on what draws you in the writing pane
2. **Watch** — AI-generated aesthetic scenes drift across the canvas
3. **Discover** — Products appear naturally *inside* scenes (labeled with ◈)
4. **Save or release** — Cards fade unless saved; no infinite scroll
5. **Shop later** — Saved cards become a "shop my taste" collection

---

## Key Features

### Consumer Experience
- **Writing Pane** — Diary-like notes that capture *why* you're drawn to something, not just *that* you are. The AI reads your writing alongside visible cards for deep personalization.
- **Slow Discovery Canvas** — Cards drift gradually, inviting contemplation rather than consumption. No infinite scroll. No algorithmic anxiety.
- **Native Product Placement** — Products are AI-generated *into* scenes from the start—not overlaid after. Labeled with ◈ for transparency.
- **Hover-to-Reveal** — Subtle breathing outlines; hover to pause and explore product details
- **Shop My Taste** — Saved cards become a curated collection you can purchase from when ready

### Advertiser Console
- **Product Catalog Management** — Upload and select products to advertise
- **Demographic Targeting** — Age ranges, interests, aesthetic preferences
- **Vibe Matching** — Scene types, mood filters, custom semantic queries
- **Placement Prompts** — Control how products appear (subtle, prominent, editorial, in-use)
- **Matrix Generation** — Generate Products × Aesthetics combinations for testing
- **Live Preview** — See AI-generated product placement before deploying

---

## Why AI-Generated Content?

Unlike Pinterest (user-uploaded) or Instagram (social graph), our feed is **fully generative**:

| Approach | Content Source | Product Integration | Personalization |
|----------|----------------|---------------------|-----------------|
| Pinterest | User uploads | Separate ad slots | Engagement-based |
| Instagram Shopping | User photos | Tagged overlays | Social graph |
| **Reverie** | AI-generated | Native to image | Writing + saves |

**Benefits of fully generative content:**
- Products are *native* to the scene—no awkward retrofitting
- No two-sided marketplace problem (we don't need creators to upload)
- Every scene can be personalized to the user's articulated taste
- Similar to Sora's approach: pure AI content as a new medium

---

## Disclosure & Transparency

Per [FTC native advertising guidelines](https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses), embedded product placements require clear disclosure. Our approach:

- **◈ Symbol** — All placed products are marked with a discrete icon
- **"Placed" Label** — Hover popup shows "◈ Placed" to indicate commercial content
- **AI-Generated Disclosure** — Scenes are labeled as AI-generated

We believe seamless *experience* and honest *disclosure* are compatible. The interface feels natural; the labeling is clear.

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI + Python + uv
- **Text Model:** Gemini 3 Pro (semantic matching, personalization)
- **Image Model:** Nano Banana Pro (scene generation, product integration)
- **Editor:** TipTap (rich text writing pane)
- **Styling:** Custom CSS with glassmorphism, micro-animations, 4pm Paris aesthetic

---

## Setup Instructions

```bash
# Install dependencies
npm install
cd backend && uv sync && cd ..

# Start both servers (backend :8000, frontend :4173)
make serve

# Or for development with hot reload
make dev

# Stop all servers
make kill
```

**Environment Setup:**
```bash
# backend/.env
GEMINI_API_KEY=your_api_key_here
```

---

## Future Directions

- **Traces Archive** — Faded cards persist in a dim "traces" section for 48 hours before truly fading. You can revive them if you change your mind. The AI remembers everything for personalization—even what you let go.
- **Bidirectional Prompts** — LLM asks clarifying questions based on what you save ("You've saved three images with rain-streaked windows. What draws you to that mood?")
- **Vibe Extraction** — Parse writing to extract latent themes (autumnal, quiet, nostalgic) and show them back to the user
- **"Why This?" Explanations** — Show why a scene was generated for you ("Matched because: warm lighting + linen textures + your note about morning stillness")
- **Taste Profile Export** — Share your curated taste with friends or stylists as a portable mood board
- **Time-Delayed Purchase Prompts** — "You saved this 3 weeks ago. Still love it?" Respects the contemplative pace.

---

## Screenshots

[Screenshots to be added]
