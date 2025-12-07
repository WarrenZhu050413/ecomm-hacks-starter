import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(120000);

const logs = [];
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('[ScrollTrigger]') || text.includes('[InitialGeneration]') || text.includes('[AddPlacements]') || text.includes('Generation')) {
    logs.push(`[${new Date().toISOString().slice(11,19)}] ${text}`);
    console.log(`[LOG] ${text.slice(0, 150)}`);
  }
});

console.log('Navigating to /gallery...');
await page.goto('http://localhost:5173/gallery', { waitUntil: 'domcontentloaded', timeout: 60000 });

console.log('Waiting 3 seconds for React to mount...');
await page.waitForTimeout(3000);

console.log('Scrolling down to trigger generation...');
// Get the gallery container and scroll within it
const galleryPane = await page.$('.gallery-pane');
if (galleryPane) {
  const box = await galleryPane.boundingBox();
  if (box) {
    // Move mouse to gallery pane first
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  }
}

for (let i = 0; i < 20; i++) {
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(100);
}

console.log('Waiting 90 seconds for pipeline to complete...');
// Monitor every 10 seconds
for (let i = 0; i < 9; i++) {
  await page.waitForTimeout(10000);
  const lastLog = logs[logs.length - 1] || '';
  console.log(`[${(i+1)*10}s] Last log: ${lastLog.slice(0, 100)}`);

  // Check if generation completed
  if (lastLog.includes('isGenerating: false') && !lastLog.includes('hasInitialGenerated is false')) {
    console.log('Generation completed! Testing scroll trigger...');
    break;
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Total logs captured: ${logs.length}`);

// Count blocked types
const blockedInitial = logs.filter(l => l.includes('hasInitialGenerated is false')).length;
const blockedGenerating = logs.filter(l => l.includes('Blocked: isGenerating')).length;
const blockedGated = logs.filter(l => l.includes('Blocked: isGated')).length;
const triggered = logs.filter(l => l.includes('TRIGGERING')).length;
const addPlacements = logs.filter(l => l.includes('[AddPlacements]')).length;

console.log(`Blocked by hasInitialGenerated: ${blockedInitial}`);
console.log(`Blocked by isGenerating: ${blockedGenerating}`);
console.log(`Blocked by isGated: ${blockedGated}`);
console.log(`Triggered generation: ${triggered}`);
console.log(`AddPlacements logs: ${addPlacements}`);

await browser.close();
