const pptxgen = require('pptxgenjs');
const path = require('path');

// Color palette - luxury soft (NO # prefix for PptxGenJS)
const COLORS = {
  bg: 'F9F6F2',
  text: '2A2520',
  textMuted: '6B5F52',
  accent: 'B86B4A',
  accentLight: 'C98A5C',
  soft: '7A9070',
  labelMuted: '9A8B7A',
  divider: 'C9A574',
  glass: 'FFFFFF',
  glassBg: 'FFFFFF',
  slideNum: 'B8A898'
};

async function buildPresentation() {
  console.log('Building Reverie presentation...\n');

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Reverie';
  pptx.author = 'Warren Zhu & Matthew Kotzbauer';
  pptx.subject = 'Invisible commerce for the visual web';

  // Helper: add slide number
  const addSlideNum = (slide, num) => {
    slide.addText(`0${num} — 06`, { x: 8.5, y: 5.2, w: 1.3, h: 0.3, fontSize: 10, color: COLORS.slideNum, align: 'right', fontFace: 'Arial' });
  };

  // ===== SLIDE 1: Title =====
  console.log('Creating slide 1: Title');
  const slide1 = pptx.addSlide();
  slide1.background = { color: COLORS.bg };

  // Decorative gradient orbs (as soft circles)
  slide1.addShape(pptx.shapes.OVAL, { x: -1, y: -1, w: 4, h: 4, fill: { type: 'solid', color: 'D4A574' }, shadow: { type: 'outer', blur: 80, offset: 0, angle: 0, opacity: 0.2 } });
  slide1.addShape(pptx.shapes.OVAL, { x: 7, y: 3.5, w: 3.5, h: 3.5, fill: { type: 'solid', color: 'A8B5A0' }, shadow: { type: 'outer', blur: 80, offset: 0, angle: 0, opacity: 0.2 } });

  slide1.addText('ECOMM HACKS 2024', { x: 0, y: 1.5, w: 10, h: 0.4, fontSize: 11, color: COLORS.labelMuted, align: 'center', fontFace: 'Arial', charSpacing: 4 });
  slide1.addText('Ephemeral', { x: 0, y: 2.0, w: 10, h: 1.2, fontSize: 72, color: COLORS.text, align: 'center', fontFace: 'Georgia', bold: false });
  slide1.addText('Invisible commerce for the visual web', { x: 0, y: 3.2, w: 10, h: 0.5, fontSize: 22, color: '8A7B6A', align: 'center', fontFace: 'Georgia', italic: true });

  // Divider line
  slide1.addShape(pptx.shapes.LINE, { x: 4.4, y: 3.9, w: 1.2, h: 0, line: { color: COLORS.divider, width: 1 } });

  slide1.addText('WARREN ZHU & MATTHEW KOTZBAUER', { x: 0, y: 4.2, w: 10, h: 0.4, fontSize: 12, color: 'A09080', align: 'center', fontFace: 'Arial', charSpacing: 3 });
  addSlideNum(slide1, 1);

  // ===== SLIDE 2: Problem =====
  console.log('Creating slide 2: Problem');
  const slide2 = pptx.addSlide();
  slide2.background = { color: COLORS.bg };

  slide2.addText('THE PROBLEM', { x: 0, y: 0.6, w: 10, h: 0.3, fontSize: 11, color: COLORS.accent, align: 'center', fontFace: 'Arial', charSpacing: 4 });
  slide2.addText([
    { text: 'Visual platforms have an ', options: { color: COLORS.text } },
    { text: 'advertising problem', options: { color: COLORS.accent } }
  ], { x: 0, y: 1.0, w: 10, h: 0.8, fontSize: 40, align: 'center', fontFace: 'Georgia' });

  // Problem cards
  // Card 1
  slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 2.0, w: 4, h: 2.8, fill: { color: COLORS.glassBg, transparency: 40 }, line: { color: 'E0E0E0', width: 0.5 }, rectRadius: 0.15 });
  slide2.addText('50%', { x: 0.8, y: 2.2, w: 4, h: 0.9, fontSize: 56, color: COLORS.accent, align: 'center', fontFace: 'Georgia' });
  slide2.addText('Pinterest is ads', { x: 0.8, y: 3.1, w: 4, h: 0.4, fontSize: 22, color: '3D3830', align: 'center', fontFace: 'Georgia' });
  slide2.addText('Users overwhelmed by sponsored content.\nAds drown out what they came to discover.', { x: 1.0, y: 3.5, w: 3.6, h: 1, fontSize: 12, color: COLORS.textMuted, align: 'left', fontFace: 'Arial', lineSpacing: 18 });

  // Card 2
  slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 5.2, y: 2.0, w: 4, h: 2.8, fill: { color: COLORS.glassBg, transparency: 40 }, line: { color: 'E0E0E0', width: 0.5 }, rectRadius: 0.15 });
  slide2.addText('Chat', { x: 5.2, y: 2.2, w: 4, h: 0.9, fontSize: 56, color: COLORS.accent, align: 'center', fontFace: 'Georgia' });
  slide2.addText('Wrong interface', { x: 5.2, y: 3.1, w: 4, h: 0.4, fontSize: 22, color: '3D3830', align: 'center', fontFace: 'Georgia' });
  slide2.addText('Shopping is serendipity. Chatbot Q&A\nfeels jarring when users want to browse.', { x: 5.4, y: 3.5, w: 3.6, h: 1, fontSize: 12, color: COLORS.textMuted, align: 'left', fontFace: 'Arial', lineSpacing: 18 });

  addSlideNum(slide2, 2);

  // ===== SLIDE 3: Solution =====
  console.log('Creating slide 3: Solution');
  const slide3 = pptx.addSlide();
  slide3.background = { color: COLORS.bg };

  slide3.addText('OUR SOLUTION', { x: 0, y: 0.6, w: 10, h: 0.3, fontSize: 11, color: COLORS.accent, align: 'center', fontFace: 'Arial', charSpacing: 4 });
  slide3.addText([
    { text: 'Products ', options: { color: COLORS.text } },
    { text: 'inside', options: { color: COLORS.soft } },
    { text: ' images, not on top', options: { color: COLORS.text } }
  ], { x: 0, y: 1.0, w: 10, h: 0.8, fontSize: 40, align: 'center', fontFace: 'Georgia' });

  // Before card
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 1.5, y: 2.0, w: 2.8, h: 2.4, fill: { color: 'E5DED5' }, line: { color: 'D0C8BC', width: 0.5 }, rectRadius: 0.12 });
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 2.1, y: 2.6, w: 1.6, h: 0.5, fill: { color: COLORS.accent }, rectRadius: 0.05 });
  slide3.addText('SPONSORED', { x: 2.1, y: 2.6, w: 1.6, h: 0.5, fontSize: 9, color: 'FFFFFF', align: 'center', fontFace: 'Arial', bold: true, charSpacing: 1 });
  slide3.addText('Traditional overlay', { x: 1.5, y: 4.4, w: 2.8, h: 0.3, fontSize: 11, color: '8A7B6A', align: 'center', fontFace: 'Arial' });

  // Arrow
  slide3.addText('→', { x: 4.5, y: 2.9, w: 1, h: 0.6, fontSize: 28, color: COLORS.divider, align: 'center', fontFace: 'Arial' });

  // After card
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 5.7, y: 2.0, w: 2.8, h: 2.4, fill: { color: COLORS.glassBg, transparency: 40 }, line: { color: 'E0E0E0', width: 0.5 }, rectRadius: 0.12 });
  slide3.addShape(pptx.shapes.OVAL, { x: 6.85, y: 2.9, w: 0.3, h: 0.3, fill: { color: COLORS.soft }, shadow: { type: 'outer', blur: 10, offset: 0, angle: 0, color: COLORS.soft, opacity: 0.5 } });
  slide3.addText('Ephemeral integration', { x: 5.7, y: 4.4, w: 2.8, h: 0.3, fontSize: 11, color: '8A7B6A', align: 'center', fontFace: 'Arial' });

  slide3.addText([
    { text: 'Nano Banana Pro', options: { color: COLORS.accent } },
    { text: ' edits products INTO content. Discovery through subtle hover.', options: { color: COLORS.textMuted } }
  ], { x: 1, y: 4.9, w: 8, h: 0.4, fontSize: 14, align: 'center', fontFace: 'Arial' });

  addSlideNum(slide3, 3);

  // ===== SLIDE 4: How It Works =====
  console.log('Creating slide 4: How It Works');
  const slide4 = pptx.addSlide();
  slide4.background = { color: COLORS.bg };

  slide4.addText('ARCHITECTURE', { x: 0, y: 0.6, w: 10, h: 0.3, fontSize: 11, color: COLORS.accent, align: 'center', fontFace: 'Arial', charSpacing: 4 });
  slide4.addText('The flow', { x: 0, y: 1.0, w: 10, h: 0.7, fontSize: 40, color: COLORS.text, align: 'center', fontFace: 'Georgia' });

  const flowItems = [
    { icon: '📦', title: 'Advertiser', desc: 'Uploads products &\ntargeting criteria' },
    { icon: '🎯', title: 'Match', desc: 'Semantic matching\nto user content' },
    { icon: '🍌', title: 'Generate', desc: 'Nano Banana edits\nproduct in' },
    { icon: '👆', title: 'Discover', desc: 'Hover reveals,\n1-click purchase' }
  ];

  const startX = 0.8;
  const stepW = 2.0;
  const arrowW = 0.4;

  flowItems.forEach((item, i) => {
    const x = startX + i * (stepW + arrowW);

    // Icon circle
    slide4.addShape(pptx.shapes.OVAL, { x: x + 0.65, y: 2.1, w: 0.7, h: 0.7, fill: { color: COLORS.glassBg, transparency: 30 }, line: { color: 'E0E0E0', width: 0.5 } });
    slide4.addText(item.icon, { x: x + 0.65, y: 2.2, w: 0.7, h: 0.5, fontSize: 22, align: 'center', fontFace: 'Arial' });

    // Title
    slide4.addText(item.title, { x: x, y: 2.95, w: stepW, h: 0.35, fontSize: 16, color: '3D3830', align: 'center', fontFace: 'Georgia' });

    // Description
    slide4.addText(item.desc, { x: x, y: 3.35, w: stepW, h: 0.7, fontSize: 11, color: COLORS.textMuted, align: 'center', fontFace: 'Arial', lineSpacing: 15 });

    // Arrow (except after last)
    if (i < flowItems.length - 1) {
      slide4.addText('→', { x: x + stepW - 0.1, y: 2.3, w: 0.6, h: 0.4, fontSize: 18, color: COLORS.divider, align: 'center', fontFace: 'Arial' });
    }
  });

  addSlideNum(slide4, 4);

  // ===== SLIDE 5: Advertiser Console =====
  console.log('Creating slide 5: Advertiser Console');
  const slide5 = pptx.addSlide();
  slide5.background = { color: COLORS.bg };

  slide5.addText('DEMO', { x: 0, y: 0.5, w: 10, h: 0.3, fontSize: 11, color: COLORS.accent, align: 'center', fontFace: 'Arial', charSpacing: 4 });
  slide5.addText('Advertiser Console', { x: 0, y: 0.85, w: 10, h: 0.7, fontSize: 40, color: COLORS.text, align: 'center', fontFace: 'Georgia' });

  // Glass container
  slide5.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 1.7, w: 8.4, h: 2.7, fill: { color: COLORS.glassBg, transparency: 40 }, line: { color: 'E0E0E0', width: 0.5 }, rectRadius: 0.15 });

  const features5 = [
    { icon: '📦', title: 'Product Catalog', desc: 'Upload and manage products for placement' },
    { icon: '👥', title: 'Demographics', desc: 'Age ranges, interests, custom buckets' },
    { icon: '🎨', title: 'Aesthetic Matching', desc: 'Scene types, vibes, semantic filters' },
    { icon: '🧪', title: 'Live Testing', desc: 'Preview AI placements before deploy' }
  ];

  features5.forEach((feat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 1.2 + col * 4.0;
    const y = 2.0 + row * 1.2;

    // Icon box
    slide5.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: x, y: y, w: 0.5, h: 0.5, fill: { color: 'F5EDE3' }, rectRadius: 0.08 });
    slide5.addText(feat.icon, { x: x, y: y + 0.05, w: 0.5, h: 0.4, fontSize: 16, align: 'center', fontFace: 'Arial' });

    slide5.addText(feat.title, { x: x + 0.65, y: y - 0.02, w: 3.2, h: 0.35, fontSize: 16, color: '3D3830', align: 'left', fontFace: 'Georgia' });
    slide5.addText(feat.desc, { x: x + 0.65, y: y + 0.3, w: 3.2, h: 0.3, fontSize: 11, color: COLORS.textMuted, align: 'left', fontFace: 'Arial' });
  });

  slide5.addText('→  localhost:4173/advertiser', { x: 0, y: 4.6, w: 10, h: 0.35, fontSize: 13, color: COLORS.labelMuted, align: 'center', fontFace: 'Arial' });

  addSlideNum(slide5, 5);

  // ===== SLIDE 6: Consumer Experience =====
  console.log('Creating slide 6: Consumer Experience');
  const slide6 = pptx.addSlide();
  slide6.background = { color: COLORS.bg };

  slide6.addText('DEMO', { x: 0, y: 0.5, w: 10, h: 0.3, fontSize: 11, color: COLORS.accent, align: 'center', fontFace: 'Arial', charSpacing: 4 });
  slide6.addText('Consumer Experience', { x: 0, y: 0.85, w: 10, h: 0.7, fontSize: 40, color: COLORS.text, align: 'center', fontFace: 'Georgia' });

  // Glass container
  slide6.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 1.7, w: 8.4, h: 2.7, fill: { color: COLORS.glassBg, transparency: 40 }, line: { color: 'E0E0E0', width: 0.5 }, rectRadius: 0.15 });

  const features6 = [
    { icon: '✨', title: 'Ephemeral Canvas', desc: 'Cards fade unless saved — urgency & focus' },
    { icon: '👁️', title: 'Invisible Placement', desc: 'Products edited INTO images seamlessly' },
    { icon: '🫧', title: 'Hover Discovery', desc: 'Breathing outlines that fade with cards' },
    { icon: '⚡', title: '1-Click Checkout', desc: 'Glassmorphic popup, instant add to bag' }
  ];

  features6.forEach((feat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 1.2 + col * 4.0;
    const y = 2.0 + row * 1.2;

    slide6.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: x, y: y, w: 0.5, h: 0.5, fill: { color: 'F5EDE3' }, rectRadius: 0.08 });
    slide6.addText(feat.icon, { x: x, y: y + 0.05, w: 0.5, h: 0.4, fontSize: 16, align: 'center', fontFace: 'Arial' });

    slide6.addText(feat.title, { x: x + 0.65, y: y - 0.02, w: 3.2, h: 0.35, fontSize: 16, color: '3D3830', align: 'left', fontFace: 'Georgia' });
    slide6.addText(feat.desc, { x: x + 0.65, y: y + 0.3, w: 3.2, h: 0.3, fontSize: 11, color: COLORS.textMuted, align: 'left', fontFace: 'Arial' });
  });

  slide6.addText('→  localhost:4173/prototype', { x: 0, y: 4.6, w: 10, h: 0.35, fontSize: 13, color: COLORS.labelMuted, align: 'center', fontFace: 'Arial' });

  addSlideNum(slide6, 6);

  // ===== SAVE =====
  const outputPath = path.join(__dirname, '..', 'Reverie.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\nPresentation saved to: ${outputPath}`);

  return outputPath;
}

buildPresentation().catch(console.error);
