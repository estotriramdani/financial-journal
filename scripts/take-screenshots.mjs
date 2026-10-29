import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.resolve(process.cwd(), 'docs', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const USER = {
  email: 'estolagi@gmail.com',
  password: 'qwe123',
};

async function takeScreenshots() {
  console.log('📸 Starting Playwright mobile screenshot capture...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  // Mobile viewport (iPhone 14 / modern standard mobile: 390x844 with 2x retina)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  });

  const page = await context.newPage();

  const hideOverlay = async () => {
    try {
      await page.addStyleTag({
        content: `
          nextjs-portal { display: none !important; pointer-events: none !important; }
          * { -webkit-font-smoothing: antialiased; }
        `,
      });
    } catch {}
  };

  try {
    // 1. SCREENSHOT: Login Screen
    console.log('  Capturing 01-login.png...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await hideOverlay();
    await page.waitForSelector('h1:has-text("Jurnal Keuangan")', { timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01-login.png'),
    });
    console.log('  ✓ 01-login.png captured.');

    // Log in
    await page.fill('input[type="email"]', USER.email);
    await page.fill('input[type="password"]', USER.password);
    await page.click('button:has-text("Masuk ke Aplikasi")', { force: true });
    await page.waitForSelector('span:has-text("FINJRNL")', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await hideOverlay();

    // 2. SCREENSHOT: Journal Feed & Balance (Light Mode)
    console.log('  Capturing 02-journal-feed.png...');
    await page.click('button[data-tab="journal"]', { force: true });
    await page.waitForTimeout(1000);
    await hideOverlay();
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02-journal-feed.png'),
    });
    console.log('  ✓ 02-journal-feed.png captured.');

    // 3. SCREENSHOT: On-Screen Calculator Keypad Modal
    console.log('  Capturing 03-calculator-keypad.png...');
    await page.click('button:has-text("Catat")', { force: true });
    await page.waitForSelector('h3:has-text("Pengeluaran Baru")', { timeout: 8000 });
    await page.waitForSelector('span:has-text("Nominal Transaksi (Kalkulator)")', { timeout: 5000 });

    // Tap on calculator keypad: 1, 5, 0, 000
    await page.click('div.grid-cols-4 button:has-text("1")', { force: true });
    await page.click('div.grid-cols-4 button:has-text("5")', { force: true });
    await page.click('div.grid-cols-4 button:has-text("0")', { force: true });
    await page.click('div.grid-cols-4 button:has-text("000")', { force: true });
    await page.fill('input[placeholder*="Makan siang"]', 'Kopi & Croissant');
    await page.waitForTimeout(500);
    await hideOverlay();

    await page.screenshot({
      path: path.join(OUTPUT_DIR, '03-calculator-keypad.png'),
    });
    console.log('  ✓ 03-calculator-keypad.png captured.');

    // Close modal by clicking outside or close button
    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click({ force: true });
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(800);

    // 4. SCREENSHOT: Reports & Analytics
    console.log('  Capturing 04-reports.png...');
    await page.click('button[data-tab="reports"]', { force: true });
    await page.waitForSelector('h2:has-text("Statistik & Analisis")', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await hideOverlay();
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '04-reports.png'),
    });
    console.log('  ✓ 04-reports.png captured.');

    // 5. SCREENSHOT: Group Management
    console.log('  Capturing 05-groups.png...');
    await page.click('button[data-tab="groups"]', { force: true });
    await page.waitForSelector('h2:has-text("Kelola Grup Keuangan")', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await hideOverlay();
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '05-groups.png'),
    });
    console.log('  ✓ 05-groups.png captured.');

    // 6. SCREENSHOT: Dark Mode Journal View
    console.log('  Capturing 06-dark-mode.png...');
    await page.click('button[data-tab="profile"]', { force: true });
    await page.waitForSelector('button:has-text("Gelap")', { timeout: 8000 });
    await page.click('button:has-text("Gelap")', { force: true });
    await page.waitForTimeout(600);

    // Go back to Journal tab in Dark Mode
    await page.click('button[data-tab="journal"]', { force: true });
    await page.waitForTimeout(1000);
    await hideOverlay();
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '06-dark-mode.png'),
    });
    console.log('  ✓ 06-dark-mode.png captured.');

    console.log('\n🎉 All 6 mobile screenshots captured successfully in docs/screenshots/!');
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
