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

// Anything that would tell a buyer - or Sheldon - that this page came from the
// other client's build. 'RP' and 'RP-' are in here because the order reference
// and the chat avatar used to carry them and the old sweep could not see it.
const BANNED = /(\bready ?pool\b|readypool|\btampa\b|\bhearth\b|gethearth|slipstream|lounge chairs|\bRP-|>RP<|\bRP\b|still water|sunlit)/i;

function firstBanned(text) {
  const m = text.match(BANNED);
  if (!m) return null;
  const i = Math.max(0, m.index - 60);
  return `${JSON.stringify(m[0])} in "...${text.slice(i, m.index + 80).replace(/\s+/g, ' ')}..."`;
}

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

async function fillStep2(page, { zip = '64108', name = 'Jordan Rivera', addr = '1420 Oak Ridge Rd, Kansas City, MO',
                                 phone = '(913) 555-0123', email = 'buyer@example.com' } = {}) {
  await page.fill('#zip3', zip);
  await page.fill('#f-name', name);
  await page.fill('#f-addr', addr);
  await page.fill('#f-phone', phone);
  await page.fill('#f-email', email);
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

  await expect(page.locator('img[alt="Midwest Container Pools"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('(913) 705-0591');

  await expect(page.locator('[data-model]')).toHaveCount(2);
  await expect(page.locator('[data-model="20ft"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#stepRoot')).toContainText('$46,440');
  await expect(page.locator('#stepRoot')).toContainText('Hayward cartridge filter');
  await expect(page.locator('#stepRoot')).toContainText('5-year structural · 3-year equipment warranty');

  await expect(page.locator('#stepRoot')).toContainText('$4,656');
  await expect(page.locator('#stepRoot')).toContainText('$3,154');
  await expect(page.locator('#stepRoot')).toContainText('$1,977');

  await page.click('[data-color="slate"]');
  await page.click('[data-upg="heat-pump"]');
  await page.click('[data-upg="salt"]');
  await page.click('[data-install="above"]');
  await page.screenshot({ path: shot('desktop-step1-design.png'), fullPage: true });
  await page.click('[data-continue]');

  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');
  await expect(page.locator('#stepRoot')).toContainText('Delivery from Leavenworth, KS');
  await expect(page.locator('#stepRoot')).toContainText('Pick up in Leavenworth');
  await fillStep2(page);
  await page.click('[data-fulfill="delivery"]');
  await page.screenshot({ path: shot('desktop-step2-delivery.png'), fullPage: true });
  await page.click('[data-continue]');

  // 46,440 + 0 color + 4,656 + 1,977 = 53,073
  await expect(page.locator('#stepRoot')).toContainText('$53,073');
  await page.screenshot({ path: shot('desktop-step3-review.png'), fullPage: true });
  await page.click('[data-continue]');

  await expect(page.locator('[data-pm]')).toHaveCount(6);
  await page.click('[data-pm="financing"]');
  const hfs = page.locator('a[href*="hfsfinancial.net"]');
  await expect(hfs).toBeVisible();
  expect(await hfs.getAttribute('target')).toBe('_blank');
  expect(await hfs.getAttribute('rel')).toContain('noopener');
  await expect(page.locator('#stepRoot')).toContainText('HFS Financial');
  await page.click('[data-pm="card"]');
  await page.check('#termsChk');
  const terms = page.locator('a[href*="Midwest-Container-Pools-Terms-and-Conditions.pdf"]').first();
  await expect(terms).toBeVisible();
  await page.screenshot({ path: shot('desktop-step4-payment.png'), fullPage: true });

  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('40ft model drives the totals, the rail and the review line — $71,944 with gas heater', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-model="40ft"]');
  await expect(page.locator('#stepRoot')).toContainText('$68,790');
  await expect(page.locator('#stepRoot')).toContainText('tanning ledge');

  // The persistent rail must follow the model, not print the 20ft's spec.
  await expect(page.locator('#railBody')).toContainText("40' x 8' x 4'");
  await expect(page.locator('#railBody')).toContainText('$68,790');
  await expect(page.locator('#railBody')).not.toContainText("20' x 8' x 4'");

  await page.click('[data-color="charcoal"]');
  await page.click('[data-upg="gas-heater"]');
  await page.click('[data-install="in-ground"]');
  await page.click('[data-continue]');
  await fillStep2(page, { zip: '66048', name: 'Sam Vega', addr: '9 Riverside Dr, Leavenworth, KS', phone: '9135550142', email: 'sam@example.com' });
  await page.click('[data-continue]');
  // 68,790 + 3,154 = 71,944
  await expect(page.locator('#stepRoot')).toContainText('$71,944');
  await page.screenshot({ path: shot('desktop-40ft-review.png'), fullPage: true });
});

test('exterior color is included at no charge', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="sand"]');
  // Assert the rendered price, not the app's own subtotal() - a wrong label
  // would otherwise be invisible.
  await expect(page.locator('#railBody')).toContainText('$46,440');
  await expect(page.locator('#stepRoot')).toContainText('fully customizable');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await fillStep2(page);
  await page.click('[data-continue]');
  await expect(page.locator('#stepRoot')).toContainText('$46,440');
  await expect(page.locator('#stepRoot')).not.toContainText('$399');
  await expect(page.locator('#stepRoot')).not.toContainText('$499');
});

test('freight estimate tracks real geography and is suppressed when it should be', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');

  // Before a ZIP is entered, delivery must not read as free.
  await expect(page.locator('#shipAmt')).toHaveText('—');
  const deliveryTile = page.locator('[data-fulfill="delivery"]');
  await expect(deliveryTile).toContainText('—');
  await expect(deliveryTile).not.toContainText('$0');

  // Kansas City MO: ~35 road miles. Assert the computed figures, not the rate label.
  await page.fill('#zip3', '64108');
  await page.click('#recalcBtn');
  await expect(page.locator('#shipMeta')).toContainText('~35 mi');
  await expect(page.locator('#shipAmt')).toHaveText('$170');

  // Farther must cost more - the old ZIP-arithmetic estimator inverted this.
  const amountFor = async zip => {
    await page.fill('#zip3', zip);
    await page.click('#recalcBtn');
    const t = await page.locator('#shipAmt').textContent();
    return Number(t.replace(/[^0-9]/g, ''));
  };
  const chicago = await amountFor('60601');   // ~470 mi
  const losAngeles = await amountFor('90210'); // ~1590 mi
  const boston = await amountFor('02101');     // ~1480 mi
  expect(chicago).toBeGreaterThan(1500);
  expect(losAngeles).toBeGreaterThan(boston);
  expect(losAngeles).toBeGreaterThan(chicago * 2);

  // Off the flatbed network: no invented number.
  await page.fill('#zip3', '96801'); // Honolulu
  await page.click('#recalcBtn');
  await expect(page.locator('#shipAmt')).toHaveText('—');
  await expect(page.locator('#shipMeta')).toContainText('Outside our flatbed delivery area');

  // Pickup means no freight anywhere on the page.
  await page.fill('#zip3', '90210');
  await page.click('#recalcBtn');
  await page.click('[data-fulfill="pickup"]');
  await expect(page.locator('#shipAmt')).toHaveText('$0');
  await expect(page.locator('#shipMeta')).toContainText('No freight');
  await fillStep2(page, { zip: '90210' });
  await page.click('[data-continue]');
  await expect(page.locator('#stepRoot')).not.toContainText('$7,711');
});

test('step 1 and step 2 gates actually block, and mark the offending field', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);

  // Step 1: no install type, no color.
  await page.click('[data-continue]');
  await expect(page.locator('#gateMsg')).toBeVisible();
  await expect(page.locator('#stepLabel')).toHaveText('Step 1 of 4');

  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');

  // Step 2: empty.
  await page.click('[data-continue]');
  await expect(page.locator('#step2Msg')).toContainText('5-digit destination ZIP');
  await expect(page.locator('#zip3')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#zip3')).toBeFocused();
  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');

  // A single-digit phone used to pass.
  await fillStep2(page, { phone: '5' });
  await page.click('[data-continue]');
  await expect(page.locator('#step2Msg')).toContainText('10-digit phone number');
  await expect(page.locator('#f-phone')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#f-phone')).toBeFocused();

  // And an address-shaped email.
  await fillStep2(page, { email: 'buyer@example' });
  await page.click('[data-continue]');
  await expect(page.locator('#step2Msg')).toContainText('valid email');
  await expect(page.locator('#f-email')).toHaveAttribute('aria-invalid', 'true');

  await fillStep2(page);
  await page.click('[data-continue]');
  await expect(page.locator('#stepLabel')).toHaveText('Step 3 of 4');
});

test('review step shows back everything the buyer typed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await fillStep2(page, { name: 'Dana Whitfield', addr: '1420 Oak Ridge Rd, Kansas City, MO', phone: '(816) 555-0134', email: 'dana@example.com' });
  await page.fill('#f-notes', 'Gate code 4417, crane access from the alley');
  await page.click('[data-continue]');

  const review = page.locator('#stepRoot');
  await expect(review).toContainText('Dana Whitfield');
  await expect(review).toContainText('1420 Oak Ridge Rd');
  await expect(review).toContainText('(816) 555-0134');
  await expect(review).toContainText('dana@example.com');
  await expect(review).toContainText('Gate code 4417');

  // The inline Edit control must go back to the step that owns the field.
  await page.click('[data-edit-step="2"]');
  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');
  await expect(page.locator('#f-email')).toHaveValue('dana@example.com');
});

test('"No upgrades" and paid upgrades are mutually exclusive', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-upg="heat-pump"]');
  await expect(page.locator('#railBody')).toContainText('$51,096');

  await page.click('[data-noupg]');
  await expect(page.locator('[data-upg="heat-pump"]')).toHaveAttribute('data-selected', 'false');
  await expect(page.locator('#railBody')).toContainText('$46,440');

  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await fillStep2(page);
  await page.click('[data-continue]');
  await expect(page.locator('#stepRoot')).toContainText('None selected');
  await expect(page.locator('#stepRoot')).not.toContainText('Cold Weather Electric Heat Pump');

  // And selecting an upgrade again clears "No upgrades".
  await page.click('[data-back]');
  await page.click('[data-back]');
  await page.click('[data-upg="salt"]');
  await expect(page.locator('[data-noupg]')).toHaveAttribute('data-selected', 'false');
  await expect(page.locator('#railBody')).toContainText('$48,417');
});

test('submitted order records the real configuration and claims no payment capture', async ({ page }) => {
  const errors = [];
  watchConsole(page, errors);
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-model="40ft"]');
  await page.click('[data-color="charcoal"]');
  await page.click('[data-upg="gas-heater"]');
  await page.click('[data-install="in-ground"]');
  await page.click('[data-continue]');
  await fillStep2(page, { zip: '66048', name: 'Sam Vega', addr: '9 Riverside Dr, Leavenworth, KS', phone: '9135550142', email: 'sam@example.com' });
  await page.click('[data-continue]');
  await page.click('[data-continue]');
  await page.click('[data-pm="zelle"]');

  // Terms are required: submitting unchecked must not produce an order.
  await page.click('#submitBtn');
  await expect(page.locator('#payMsg')).toBeVisible();
  expect(await page.locator('#thankYouHeading').count()).toBe(0);
  expect(await page.evaluate(() => window.state && state.order)).toBeFalsy();

  const panelRef = (await page.locator('#stepRoot').textContent()).match(/MCP-[A-Z0-9]{5}-\d{4}/);
  expect(panelRef, 'payment panel should show an MCP- reference').not.toBeNull();

  await page.check('#termsChk');
  await page.click('#submitBtn');
  await expect(page.locator('#thankYouHeading')).toBeVisible();

  const order = await page.evaluate(() => JSON.parse(JSON.stringify(state.order)));
  expect(order.config.baseModel).toBe('40ft');
  expect(order.config.baseModelName).toContain('40ft');
  expect(order.config.basePrice).toBe(68790);
  expect(order.config.colorName).toBe('Charcoal');
  expect(order.pricing.subtotal).toBe(71944);
  expect(order.consent.termsAccepted).toBe(true);
  expect(order.consent.termsVersion).toBeTruthy();

  // Nothing is wired to a processor, so nothing may claim a capture.
  expect(order.status).toBe('submitted');
  expect(order.payment.depositCaptured).toBe(false);
  expect(order.payment.processorRef).toBeNull();
  expect(order.payment.processorStatus).toBe('awaiting_processor');
  expect(order.payment.buyerReference).toBe(panelRef[0]);

  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toMatch(/deposit paid|order placed|build is scheduled/i);
  expect(body).toContain('Deposit due');
  expect(body).toContain(order.orderId);
  expect(order.orderId.startsWith('MCP-')).toBe(true);

  await page.screenshot({ path: shot('desktop-confirmation.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('pickup orders record no freight distance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await fillStep2(page, { zip: '90210' });
  await page.click('[data-fulfill="pickup"]');
  await page.click('[data-continue]');
  await page.click('[data-continue]');
  await page.click('[data-pm="check"]');
  await page.check('#termsChk');
  await page.click('#submitBtn');
  const order = await page.evaluate(() => JSON.parse(JSON.stringify(state.order)));
  expect(order.shipping.fulfillment).toBe('pickup');
  expect(order.shipping.estimateAmount).toBe(0);
  expect(order.shipping.distanceMiles).toBe(0);
});

test('mobile: full flow works, the bar tracks the total, and nothing overflows', async ({ page }) => {
  const errors = [];
  watchConsole(page, errors);
  await page.setViewportSize({ width: 375, height: 812 });
  await openWizard(page);
  await page.click('[data-model="20ft"]');
  await expect(page.locator('#mobileBarSubtotal')).toHaveText('$46,440');
  await page.click('[data-upg="salt"]');
  await expect(page.locator('#mobileBarSubtotal')).toHaveText('$48,417');

  // The drawer mirrors the rail and Escape closes it.
  await page.click('#viewOrderBtn');
  await expect(page.locator('#drawerBody')).toContainText('$48,417');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobileDrawer')).not.toHaveClass(/open/);

  await page.click('[data-color="white"]');
  await page.click('[data-install="partial"]');
  await page.screenshot({ path: shot('mobile-step1-design.png'), fullPage: true });
  await page.click('[data-continue]');
  await fillStep2(page, { zip: '73301', name: 'Mobile Buyer', addr: '5 Elm St, Austin, TX', phone: '9135550188', email: 'mobile@example.com' });
  await page.click('[data-fulfill="pickup"]');
  await page.click('[data-continue]');
  await expect(page.locator('#stepRoot')).toContainText('$48,417');
  await page.screenshot({ path: shot('mobile-step3-review.png'), fullPage: true });
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('no Ready Pool identity survives anywhere, including hidden UI and the confirmation', async ({ page }) => {
  const sweep = async where => {
    const text = await page.evaluate(() => document.body.innerText);
    const hit = firstBanned(text);
    expect(hit, `banned identity at ${where}: ${hit}`).toBeNull();
  };
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await sweep('hero');
  await page.click('#openWizardBtn');
  await sweep('step 1');

  // The chat popover is hidden by default, so innerText could not see its avatar.
  await page.locator('.chatBtn').first().click();
  await expect(page.locator('#chatPop')).toBeVisible();
  await sweep('chat popover');
  await expect(page.locator('#chatPop')).not.toContainText(/^RP$/);
  await page.locator('.chatBtn').first().click();

  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await sweep('step 2');
  await fillStep2(page, { zip: '66048', name: 'Test Buyer', addr: '1 A Street, Leavenworth KS', phone: '9135550000', email: 't@example.com' });
  await page.click('[data-continue]');
  await sweep('step 3');
  await page.click('[data-continue]');
  for (const pm of ['ach', 'card', 'zelle', 'wire', 'check', 'financing']) {
    await page.click(`[data-pm="${pm}"]`);
    await sweep(`payment panel ${pm}`);
  }

  // Through submit, so the order reference and email preview are in scope too.
  await page.click('[data-pm="check"]');
  await page.check('#termsChk');
  await page.click('#submitBtn');
  await expect(page.locator('#thankYouHeading')).toBeVisible();
  await sweep('confirmation');

  // And the source itself, which is public on a single-file build.
  const src = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  const srcHit = firstBanned(src);
  expect(srcHit, `banned identity in the shipped source: ${srcHit}`).toBeNull();
  expect(src).not.toMatch(/keeps the spread|broker runs|NOTE FOR ENGINEERING|IBG-drafted/i);
});

test('the linked Terms PDF exists and matches the version the order records', async ({ page }) => {
  const pdf = path.resolve(__dirname, 'assets/terms/Midwest-Container-Pools-Terms-and-Conditions.pdf');
  expect(fs.existsSync(pdf), 'Terms PDF must be committed').toBe(true);
  expect(fs.readFileSync(pdf).slice(0, 5).toString()).toBe('%PDF-');

  // The checkout must not claim anything the contract does not grant.
  const src = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  expect(src).not.toMatch(/deposit is refundable/i);

  const gen = fs.readFileSync(path.resolve(__dirname, 'assets/terms/make-terms-pdf.py'), 'utf8');
  const genVersion = gen.match(/^VERSION = "([^"]+)"/m)[1];
  const htmlVersion = src.match(/TERMS_VERSION = '([^']+)'/)[1];
  expect(htmlVersion, 'index.html TERMS_VERSION must match the generator').toBe(genVersion);
});
