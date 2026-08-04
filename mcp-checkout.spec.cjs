const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const fileUrl = process.env.MCP_TEST_URL
  || ('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
const QA_DIR = process.env.MCP_QA_DIR
  || 'D:/Neil Brain Canonical 2026-06-16/_agent-system/QA/2026-08-04 L3-372 Midwest Container Pools QA';
fs.mkdirSync(QA_DIR, { recursive: true });
const shot = name => path.join(QA_DIR, name);

test.use({ channel: 'msedge' });

function watchConsole(page, errors) {
  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'warning' && t.includes('cdn.tailwindcss.com should not be used in production')) return;
    if (['error', 'warning'].includes(msg.type())) errors.push(`${msg.type()}: ${t}`);
  });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
}

async function openWizard(page) {
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.locator('#hero')).toBeVisible();
  await page.click('#openWizardBtn');
  await expect(page.locator('#stepLabel')).toHaveText('Step 1 of 4');
}

async function noOverflow(page) {
  const o = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(o).toBeFalsy();
}

test('desktop 20ft: model pricing, MCP add-ons, KS shipping, HFS financing — $53,073', async ({ page }) => {
  const errors = [];
  watchConsole(page, errors);
  await page.setViewportSize({ width: 1440, height: 950 });
  await openWizard(page);

  // MCP identity, not Ready Pool
  await expect(page.locator('body')).not.toContainText(/ready ?pool|tampa|hearth/i);
  await expect(page.locator('img[alt="Midwest Container Pools"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('(913) 705-0591');

  // two models, 20ft selected by default
  await expect(page.locator('[data-model]')).toHaveCount(2);
  await expect(page.locator('[data-model="20ft"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#stepRoot')).toContainText('$46,440');
  await expect(page.locator('#stepRoot')).toContainText('Hayward cartridge filter');
  await expect(page.locator('#stepRoot')).toContainText('5-year structural · 3-year equipment warranty');

  // MCP add-on prices
  await expect(page.locator('#stepRoot')).toContainText('$4,656');
  await expect(page.locator('#stepRoot')).toContainText('$3,154');
  await expect(page.locator('#stepRoot')).toContainText('$1,977');

  await page.click('[data-color="slate"]');
  await page.click('[data-upg="heat-pump"]');
  await page.click('[data-upg="salt"]');
  await page.click('[data-install="above"]');
  await page.screenshot({ path: shot('desktop-step1-design.png'), fullPage: true });
  await page.click('[data-continue]');

  // shipping kept, origin Leavenworth
  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');
  await expect(page.locator('#stepRoot')).toContainText('Delivery from Leavenworth, KS');
  await expect(page.locator('#shipMeta')).toContainText('$4.85/mi');
  await expect(page.locator('#stepRoot')).toContainText('Pick up in Leavenworth');
  await page.fill('#zip3', '64108'); // Kansas City MO
  await page.click('[data-fulfill="delivery"]');
  await page.fill('#f-name', 'Jordan Rivera');
  await page.fill('#f-addr', '1420 Oak Ridge Rd, Kansas City, MO');
  await page.fill('#f-phone', '(913) 555-0123');
  await page.fill('#f-email', 'buyer@example.com');
  await page.screenshot({ path: shot('desktop-step2-delivery.png'), fullPage: true });
  await page.click('[data-continue]');

  // 46,440 + 0 color + 4,656 + 1,977 = 53,073
  await expect(page.locator('#stepRoot')).toContainText('$53,073');
  await page.screenshot({ path: shot('desktop-step3-review.png'), fullPage: true });
  await page.click('[data-continue]');

  // six methods as-built; financing = HFS
  await expect(page.locator('[data-pm]')).toHaveCount(6);
  await page.click('[data-pm="financing"]');
  const hfs = page.locator('a[href*="hfsfinancial.net"]');
  await expect(hfs).toBeVisible();
  expect(await hfs.getAttribute('target')).toBe('_blank');
  await expect(page.locator('#stepRoot')).toContainText('HFS Financial');
  await page.click('[data-pm="card"]');
  await page.check('#termsChk');
  const terms = page.locator('a[href*="Midwest-Container-Pools-Terms-and-Conditions.pdf"]').first();
  await expect(terms).toBeVisible();
  await page.screenshot({ path: shot('desktop-step4-payment.png'), fullPage: true });

  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('40ft model drives every total — $71,944 with gas heater', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-model="40ft"]');
  await expect(page.locator('#stepRoot')).toContainText('$68,790');
  await expect(page.locator('#stepRoot')).toContainText('tanning ledge');
  await page.click('[data-color="charcoal"]');
  await page.click('[data-upg="gas-heater"]');
  await page.click('[data-install="in-ground"]');
  await page.click('[data-continue]');
  await page.fill('#zip3', '66048');
  await page.fill('#f-name', 'Sam Vega');
  await page.fill('#f-addr', '9 Riverside Dr, Leavenworth, KS');
  await page.fill('#f-phone', '9135550142');
  await page.fill('#f-email', 'sam@example.com');
  await page.click('[data-continue]');
  // 68,790 + 3,154 = 71,944
  await expect(page.locator('#stepRoot')).toContainText('$71,944');
  await page.screenshot({ path: shot('desktop-40ft-review.png'), fullPage: true });
});

test('exterior color is included at no charge', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  const before = await page.evaluate(() => subtotal());
  await page.click('[data-color="sand"]');
  const after = await page.evaluate(() => subtotal());
  expect(after).toBe(before); // MCP publishes no color fee
  await expect(page.locator('#stepRoot')).toContainText('fully customizable');
});

test('mobile: full flow works and nothing overflows', async ({ page }) => {
  const errors = [];
  watchConsole(page, errors);
  await page.setViewportSize({ width: 375, height: 812 });
  await openWizard(page);
  await page.click('[data-model="20ft"]');
  await page.click('[data-color="white"]');
  await page.click('[data-install="partial"]');
  await page.screenshot({ path: shot('mobile-step1-design.png'), fullPage: true });
  await page.click('[data-continue]');
  await page.fill('#zip3', '73301');
  await page.click('[data-fulfill="pickup"]');
  await page.fill('#f-name', 'Mobile Buyer');
  await page.fill('#f-addr', '5 Elm St');
  await page.fill('#f-phone', '9135550188');
  await page.fill('#f-email', 'mobile@example.com');
  await page.click('[data-continue]');
  await expect(page.locator('#stepRoot')).toContainText('$46,440');
  await page.screenshot({ path: shot('mobile-step3-review.png'), fullPage: true });
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('no Ready Pool identity survives anywhere in the flow', async ({ page }) => {
  const BANNED = /\b(ready ?pool|readypool|tampa|hearth|gethearth|slipstream|lounge chairs)\b/i;
  const body = async () => page.evaluate(() => document.body.innerText);
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  expect(await body()).not.toMatch(BANNED);
  await page.click('#openWizardBtn');
  expect(await body()).not.toMatch(BANNED);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  expect(await body()).not.toMatch(BANNED);
  await page.fill('#zip3', '66048');
  await page.fill('#f-name', 'T');
  await page.fill('#f-addr', '1 A St');
  await page.fill('#f-phone', '9135550000');
  await page.fill('#f-email', 't@example.com');
  await page.click('[data-continue]');
  expect(await body()).not.toMatch(BANNED);
  await page.click('[data-continue]');
  for (const pm of ['ach', 'card', 'zelle', 'wire', 'check', 'financing']) {
    await page.click(`[data-pm="${pm}"]`);
    expect(await body(), `banned identity with ${pm}`).not.toMatch(BANNED);
  }
});
