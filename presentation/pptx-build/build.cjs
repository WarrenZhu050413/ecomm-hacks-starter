const pptxgen = require('pptxgenjs');
const html2pptx = require('/Users/wz/.claude/plugins/marketplaces/anthropic-agent-skills/document-skills/pptx/scripts/html2pptx.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WORK_DIR = __dirname;

// Color palette - luxury soft
const COLORS = {
  bg: 'F9F6F2',
  text: '2A2520',
  textMuted: '6B5F52',
  accent: 'B86B4A',
  accentLight: 'C98A5C',
  soft: '7A9070',
  divider: 'C9A574',
  glass: 'FFFFFF',
  orb1: 'D4A574',
  orb2: 'A8B5A0',
  orb3: 'C4B5A5'
};

// Create gradient background
async function createBackground() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#F9F6F2"/>
        <stop offset="25%" style="stop-color:#F0EBE4"/>
        <stop offset="50%" style="stop-color:#E8E0D6"/>
        <stop offset="75%" style="stop-color:#F5EFE8"/>
        <stop offset="100%" style="stop-color:#FAF7F3"/>
      </linearGradient>
      <radialGradient id="orb1" cx="15%" cy="15%" r="30%">
        <stop offset="0%" style="stop-color:#D4A574;stop-opacity:0.35"/>
        <stop offset="100%" style="stop-color:#D4A574;stop-opacity:0"/>
      </radialGradient>
      <radialGradient id="orb2" cx="85%" cy="85%" r="25%">
        <stop offset="0%" style="stop-color:#A8B5A0;stop-opacity:0.35"/>
        <stop offset="100%" style="stop-color:#A8B5A0;stop-opacity:0"/>
      </radialGradient>
      <radialGradient id="orb3" cx="80%" cy="40%" r="20%">
        <stop offset="0%" style="stop-color:#C4B5A5;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#C4B5A5;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#orb1)"/>
    <rect width="100%" height="100%" fill="url(#orb2)"/>
    <rect width="100%" height="100%" fill="url(#orb3)"/>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(path.join(WORK_DIR, 'bg.png'));
  console.log('Created background');
}

// Create HTML slides
function createSlides() {
  const slides = [];

  // Common styles
  const baseStyle = `
    html { background: #F9F6F2; }
    body {
      width: 720pt; height: 405pt; margin: 0; padding: 0;
      font-family: Arial, sans-serif;
      display: flex; align-items: center; justify-content: center;
      background-image: url('bg.png'); background-size: cover;
    }
    .content { width: 100%; height: 100%; padding: 40pt; display: flex; flex-direction: column; }
    .center { text-align: center; align-items: center; justify-content: center; }
    h1 { font-family: Georgia, serif; font-size: 54pt; font-weight: normal; color: #2A2520; margin: 0 0 16pt 0; letter-spacing: -1pt; }
    h2 { font-family: Georgia, serif; font-size: 36pt; font-weight: normal; color: #2A2520; margin: 0 0 24pt 0; }
    h3 { font-size: 10pt; font-weight: normal; text-transform: uppercase; letter-spacing: 4pt; color: #9A8B7A; margin: 0 0 20pt 0; }
    p { font-size: 14pt; line-height: 1.6; color: #6B5F52; margin: 0; }
    .accent { color: #B86B4A; }
    .soft { color: #7A9070; }
    .tagline { font-family: Georgia, serif; font-size: 18pt; font-style: italic; color: #8A7B6A; margin: 0 0 32pt 0; }
    .team { font-size: 11pt; letter-spacing: 2pt; text-transform: uppercase; color: #A09080; }
    .divider { width: 60pt; height: 1pt; background: linear-gradient(90deg, transparent, #C9A574, transparent); margin: 24pt auto; }
    .slide-num { position: absolute; bottom: 28pt; right: 40pt; font-size: 10pt; color: #B8A898; letter-spacing: 2pt; }
    .glass { background: rgba(255,255,255,0.6); border-radius: 16pt; padding: 28pt; }
    .row { display: flex; gap: 28pt; justify-content: center; margin-top: 28pt; }
    .card { flex: 1; max-width: 280pt; }
    .stat { font-family: Georgia, serif; font-size: 48pt; font-weight: normal; color: #B86B4A; margin-bottom: 12pt; }
    .card h4 { font-family: Georgia, serif; font-size: 20pt; font-weight: normal; color: #3D3830; margin: 0 0 10pt 0; }
    .card p { font-size: 12pt; text-align: left; }
    .flow-row { display: flex; justify-content: center; align-items: flex-start; gap: 16pt; margin-top: 40pt; }
    .flow-step { width: 140pt; text-align: center; }
    .flow-icon { width: 50pt; height: 50pt; margin: 0 auto 16pt; background: rgba(255,255,255,0.7); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22pt; }
    .flow-step h4 { font-family: Georgia, serif; font-size: 14pt; font-weight: normal; color: #3D3830; margin: 0 0 6pt 0; }
    .flow-step p { font-size: 10pt; margin: 0 auto; max-width: 120pt; text-align: center; }
    .arrow { color: #C9A574; font-size: 16pt; margin-top: 24pt; }
    .feature-grid { display: flex; flex-wrap: wrap; gap: 20pt; margin-top: 28pt; }
    .feat-item { flex: 1 1 45%; display: flex; gap: 14pt; align-items: flex-start; text-align: left; }
    .feat-icon { width: 36pt; height: 36pt; background: rgba(201,165,116,0.15); border-radius: 10pt; display: flex; align-items: center; justify-content: center; font-size: 16pt; flex-shrink: 0; }
    .feat-text h4 { font-family: Georgia, serif; font-size: 16pt; font-weight: normal; color: #3D3830; margin: 0 0 4pt 0; }
    .feat-text p { font-size: 11pt; margin: 0; }
    .demo-hint { margin-top: 32pt; font-size: 12pt; color: #9A8B7A; }
    .demo-hint code { background: rgba(255,255,255,0.7); padding: 6pt 12pt; border-radius: 6pt; color: #B86B4A; font-family: Courier New, monospace; }
  `;

  // Slide 1: Title
  slides.push(`<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
    <div class="content center">
      <h3>Ecomm Hacks 2024</h3>
      <h1>Ephemeral</h1>
      <p class="tagline">Invisible commerce for the visual web</p>
      <div class="divider"></div>
      <p class="team">Warren Zhu & Matthew Kotzbauer</p>
    </div>
    <p class="slide-num">01 — 06</p>
  </body></html>`);

  // Slide 2: Problem
  slides.push(`<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
    <div class="content center">
      <h3>The Problem</h3>
      <h2>Visual platforms have an <span class="accent">advertising problem</span></h2>
      <div class="row">
        <div class="glass card">
          <p class="stat">50%</p>
          <h4>Pinterest is ads</h4>
          <p>Users overwhelmed by sponsored content. Ads drown out what they came to discover.</p>
        </div>
        <div class="glass card">
          <p class="stat">Chat</p>
          <h4>Wrong interface</h4>
          <p>Shopping is serendipity. Chatbot Q&A feels jarring when users want to browse.</p>
        </div>
      </div>
    </div>
    <p class="slide-num">02 — 06</p>
  </body></html>`);

  // Slide 3: Solution
  slides.push(`<!DOCTYPE html><html><head><style>${baseStyle}
    .sol-row { display: flex; align-items: center; justify-content: center; gap: 36pt; margin-top: 36pt; }
    .sol-card { width: 220pt; overflow: hidden; border-radius: 14pt; background: rgba(255,255,255,0.6); }
    .sol-card.before { opacity: 0.6; }
    .sol-mock { height: 140pt; background: linear-gradient(135deg, #E5DED5, #DBD3C8); display: flex; align-items: center; justify-content: center; }
    .sponsored { background: linear-gradient(135deg, #B86B4A, #C98A5C); color: white; padding: 8pt 18pt; font-size: 8pt; font-weight: bold; letter-spacing: 1pt; border-radius: 4pt; }
    .product-dot { width: 14pt; height: 14pt; border-radius: 50%; background: radial-gradient(circle, rgba(122,144,112,0.9), rgba(122,144,112,0.3) 50%, transparent 70%); box-shadow: 0 0 20pt rgba(122,144,112,0.5); }
    .sol-label { padding: 14pt; text-align: center; font-size: 11pt; color: #8A7B6A; }
    .sol-arrow { font-size: 24pt; color: #C9A574; }
  </style></head><body>
    <div class="content center">
      <h3>Our Solution</h3>
      <h2>Products <span class="soft">inside</span> images, not on top</h2>
      <div class="sol-row">
        <div class="sol-card before">
          <div class="sol-mock"><p class="sponsored">SPONSORED</p></div>
          <p class="sol-label">Traditional overlay</p>
        </div>
        <p class="sol-arrow">→</p>
        <div class="sol-card">
          <div class="sol-mock"><div class="product-dot"></div></div>
          <p class="sol-label">Ephemeral integration</p>
        </div>
      </div>
      <p style="margin-top: 28pt;"><span class="accent">Nano Banana Pro</span> edits products INTO content. Discovery through subtle hover.</p>
    </div>
    <p class="slide-num">03 — 06</p>
  </body></html>`);

  // Slide 4: How It Works
  slides.push(`<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
    <div class="content center">
      <h3>Architecture</h3>
      <h2>The flow</h2>
      <div class="flow-row">
        <div class="flow-step">
          <div class="flow-icon glass"><p>📦</p></div>
          <h4>Advertiser</h4>
          <p>Uploads products & targeting criteria</p>
        </div>
        <p class="arrow">→</p>
        <div class="flow-step">
          <div class="flow-icon glass"><p>🎯</p></div>
          <h4>Match</h4>
          <p>Semantic matching to user content</p>
        </div>
        <p class="arrow">→</p>
        <div class="flow-step">
          <div class="flow-icon glass"><p>🍌</p></div>
          <h4>Generate</h4>
          <p>Nano Banana edits product in</p>
        </div>
        <p class="arrow">→</p>
        <div class="flow-step">
          <div class="flow-icon glass"><p>👆</p></div>
          <h4>Discover</h4>
          <p>Hover reveals, 1-click purchase</p>
        </div>
      </div>
    </div>
    <p class="slide-num">04 — 06</p>
  </body></html>`);

  // Slide 5: Advertiser Console
  slides.push(`<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
    <div class="content center">
      <h3>Demo</h3>
      <h2>Advertiser Console</h2>
      <div class="glass" style="margin-top: 20pt;">
        <div class="feature-grid">
          <div class="feat-item">
            <div class="feat-icon"><p>📦</p></div>
            <div class="feat-text">
              <h4>Product Catalog</h4>
              <p>Upload and manage products for placement</p>
            </div>
          </div>
          <div class="feat-item">
            <div class="feat-icon"><p>👥</p></div>
            <div class="feat-text">
              <h4>Demographics</h4>
              <p>Age ranges, interests, custom buckets</p>
            </div>
          </div>
          <div class="feat-item">
            <div class="feat-icon"><p>🎨</p></div>
            <div class="feat-text">
              <h4>Aesthetic Matching</h4>
              <p>Scene types, vibes, semantic filters</p>
            </div>
          </div>
          <div class="feat-item">
            <div class="feat-icon"><p>🧪</p></div>
            <div class="feat-text">
              <h4>Live Testing</h4>
              <p>Preview AI placements before deploy</p>
            </div>
          </div>
        </div>
      </div>
      <p class="demo-hint">→ <code>localhost:4173/advertiser</code></p>
    </div>
    <p class="slide-num">05 — 06</p>
  </body></html>`);

  // Slide 6: Consumer Experience
  slides.push(`<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
    <div class="content center">
      <h3>Demo</h3>
      <h2>Consumer Experience</h2>
      <div class="glass" style="margin-top: 20pt;">
        <div class="feature-grid">
          <div class="feat-item">
            <div class="feat-icon"><p>✨</p></div>
            <div class="feat-text">
              <h4>Ephemeral Canvas</h4>
              <p>Cards fade unless saved — urgency & focus</p>
            </div>
          </div>
          <div class="feat-item">
            <div class="feat-icon"><p>👁️</p></div>
            <div class="feat-text">
              <h4>Invisible Placement</h4>
              <p>Products edited INTO images seamlessly</p>
            </div>
          </div>
          <div class="feat-item">
            <div class="feat-icon"><p>🫧</p></div>
            <div class="feat-text">
              <h4>Hover Discovery</h4>
              <p>Breathing outlines that fade with cards</p>
            </div>
          </div>
          <div class="feat-item">
            <div class="feat-icon"><p>⚡</p></div>
            <div class="feat-text">
              <h4>1-Click Checkout</h4>
              <p>Glassmorphic popup, instant add to bag</p>
            </div>
          </div>
        </div>
      </div>
      <p class="demo-hint">→ <code>localhost:4173/prototype</code></p>
    </div>
    <p class="slide-num">06 — 06</p>
  </body></html>`);

  // Write slide files
  slides.forEach((html, i) => {
    fs.writeFileSync(path.join(WORK_DIR, `slide${i + 1}.html`), html);
  });

  console.log(`Created ${slides.length} slide HTML files`);
  return slides.length;
}

// Build presentation
async function buildPresentation() {
  console.log('Building Reverie presentation...\n');

  // Step 1: Create background
  await createBackground();

  // Step 2: Create HTML slides
  const slideCount = createSlides();

  // Step 3: Convert to PowerPoint
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Reverie';
  pptx.author = 'Warren Zhu & Matthew Kotzbauer';
  pptx.subject = 'Invisible commerce for the visual web';

  for (let i = 1; i <= slideCount; i++) {
    console.log(`Converting slide ${i}...`);
    await html2pptx(path.join(WORK_DIR, `slide${i}.html`), pptx);
  }

  // Save
  const outputPath = path.join(WORK_DIR, '..', 'Reverie.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\nPresentation saved to: ${outputPath}`);

  return outputPath;
}

buildPresentation().catch(console.error);
