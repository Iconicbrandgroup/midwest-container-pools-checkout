const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const fileUrl = process.env.MCP_TEST_URL
  || ('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
const QA_DIR = process.env.MCP_QA_DIR
  || 'D:/Neil Brain Canonical 2026-06-16/_agent-system/QA/2026-08-24 L3-378 Midwest Container Pools QA';
fs.mkdirSync(QA_DIR, { recursive: true });
const shot = name => path.join(QA_DIR, name);

test.use({ channel: 'msedge' });

// Freight figures the estimator produces for the ZIPs used below. Pinned here so
// a regression in the distance table fails the suite instead of quietly re-pricing
// an order the buyer is now committing to.
const FREIGHT = { '64108': 170, '66048': 121 };   // 35 mi / 25 mi from Leavenworth

// Contact details Article 27 of the approved Terms gives. The checkout and the
// contract the buyer signs have to agree.
const TERMS_PHONE = '(913) 704-6316';
const TERMS_EMAIL = 'Sales@midwestcontainerpools.com';
const HFS_PROMO = 'https://www.hfsfinancial.net/promo/65cfafcd8f9d691395b70e36/';

// Anything that would tell a buyer - or Sheldon - that this page came from the
// other client's build. 'RP' and 'RP-' are in here because the order reference
// and the chat avatar used to carry them and the old sweep could not see it.
// (813) 330-7599 is Ready Pool's number, which rode in with the color-picker port.
const BANNED = /(\bready ?pool\b|readypool|\btampa\b|\bhearth\b|gethearth|slipstream|lounge chairs|\bRP-|>RP<|\bRP\b|still water|sunlit|813\)\s*330-7599)/i;

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

const money = t => Number(String(t).replace(/[^0-9]/g, ''));

test('desktop 20ft: pricing, freight in the total, 50% deposit - $51,266 order / $25,633 down', async ({ page }) => {
  const errors = [];
  watchConsole(page, errors);
  await page.setViewportSize({ width: 1440, height: 950 });
  await openWizard(page);

  await expect(page.locator('img[alt="Midwest Container Pools"]').first()).toBeVisible();
  // Contact details must be the ones in the contract, not Sheldon's mobile.
  await expect(page.locator('body')).toContainText(TERMS_PHONE);
  await expect(page.locator('body')).not.toContainText('(913) 705-0591');

  await expect(page.locator('[data-model]')).toHaveCount(2);
  await expect(page.locator('[data-model="20ft"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#stepRoot')).toContainText('$46,440');
  await expect(page.locator('#stepRoot')).toContainText('Hayward cartridge filter');
  // Article 14 covers the structure for 5 years; equipment rides its makers' warranties.
  await expect(page.locator('#stepRoot')).toContainText('equipment under manufacturer warranty');
  await expect(page.locator('#stepRoot')).not.toContainText('3-year equipment');

  await expect(page.locator('#stepRoot')).toContainText('$4,656');
  await expect(page.locator('#stepRoot')).toContainText('$3,154');

  await page.click('[data-color="slate"]');
  await page.click('[data-upg="heat-pump"]');
  await page.click('[data-install="above"]');
  await page.screenshot({ path: shot('desktop-step1-design.png'), fullPage: true });
  await page.click('[data-continue]');

  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');
  await expect(page.locator('#stepRoot')).toContainText('Delivery from Leavenworth, KS');
  await fillStep2(page);
  await page.click('[data-fulfill="delivery"]');
  await expect(page.locator('#shipAmt')).toHaveText(`$${FREIGHT['64108']}`);
  // Freight is part of the order now, so the page must not still disclaim it.
  await expect(page.locator('#stepRoot')).toContainText('is included');
  await expect(page.locator('#stepRoot')).not.toContainText('not included');
  await expect(page.locator('#stepRoot')).not.toContainText('non-binding');
  await page.screenshot({ path: shot('desktop-step2-delivery.png'), fullPage: true });
  await page.click('[data-continue]');

  // 46,440 + 4,656 = 51,096 subtotal; + 170 freight = 51,266 order; half = 25,633.
  const review = page.locator('#stepRoot');
  await expect(review).toContainText('$51,096');
  await expect(review).toContainText('$51,266');
  await expect(review).toContainText('$25,633');
  await expect(review).toContainText('Order total');
  await page.screenshot({ path: shot('desktop-step3-review.png'), fullPage: true });
  await page.click('[data-continue]');

  // ACH and financing only (Sheldon, 2026-08-24).
  await expect(page.locator('[data-pm]')).toHaveCount(2);
  await expect(page.locator('[data-pm="ach"]')).toBeVisible();
  await expect(page.locator('[data-pm="financing"]')).toBeVisible();
  for (const gone of ['card', 'zelle', 'wire', 'check']) {
    await expect(page.locator(`[data-pm="${gone}"]`)).toHaveCount(0);
  }

  await page.click('[data-pm="financing"]');
  const hfs = page.locator(`a[href="${HFS_PROMO}"]`);
  await expect(hfs).toBeVisible();
  expect(await hfs.getAttribute('target')).toBe('_blank');
  expect(await hfs.getAttribute('rel')).toContain('noopener');

  await page.click('[data-pm="ach"]');
  await page.check('#termsChk');
  const terms = page.locator('a[href*="Midwest-Container-Pools-Terms-and-Conditions.pdf"]').first();
  await expect(terms).toBeVisible();
  await page.screenshot({ path: shot('desktop-step4-payment.png'), fullPage: true });

  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('40ft drives the totals, and deposit + balance always reconstruct the order total', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-model="40ft"]');
  await expect(page.locator('#stepRoot')).toContainText('$68,790');
  await expect(page.locator('#stepRoot')).toContainText('tanning ledge');

  await expect(page.locator('#railBody')).toContainText("40' x 8' x 4'");
  await expect(page.locator('#railBody')).toContainText('$68,790');
  await expect(page.locator('#railBody')).not.toContainText("20' x 8' x 4'");

  await page.click('[data-color="charcoal"]');
  await page.click('[data-upg="gas-heater"]');
  await page.click('[data-install="in-ground"]');
  await page.click('[data-continue]');
  await fillStep2(page, { zip: '66048', name: 'Sam Vega', addr: '9 Riverside Dr, Leavenworth, KS', phone: '9135550142', email: 'sam@example.com' });
  await page.click('[data-continue]');

  // 68,790 + 3,154 = 71,944 subtotal; + 121 freight = 72,065 order.
  // That total is odd, so the halves cannot both be exact - they must still sum.
  const review = page.locator('#stepRoot');
  await expect(review).toContainText('$71,944');
  await expect(review).toContainText('$72,065');
  await expect(review).toContainText('$36,033');
  await expect(review).toContainText('$36,032');

  const figures = await page.evaluate(() => ({
    total: grandTotal(), deposit: depositAmount(), bal: balance(), fr: freight(),
  }));
  expect(figures.fr).toBe(FREIGHT['66048']);
  expect(figures.total).toBe(72065);
  expect(figures.deposit + figures.bal).toBe(figures.total);
  expect(Math.abs(figures.deposit - figures.total / 2)).toBeLessThanOrEqual(0.5);
  await page.screenshot({ path: shot('desktop-40ft-review.png'), fullPage: true });
});

test('the deposit is half the order total INCLUDING freight, not half the subtotal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');

  // A near ZIP and a far one must move the deposit, which could not happen while
  // freight sat outside the total.
  await fillStep2(page, { zip: '66048' });
  await page.click('[data-fulfill="delivery"]');
  const near = await page.evaluate(() => ({ t: grandTotal(), d: depositAmount() }));

  await page.fill('#zip3', '90001');
  await page.click('#recalcBtn');
  const far = await page.evaluate(() => ({ t: grandTotal(), d: depositAmount() }));

  expect(far.t).toBeGreaterThan(near.t);
  expect(far.d).toBeGreaterThan(near.d);
  expect(near.d).toBe(Math.round(near.t / 2));
  expect(far.d).toBe(Math.round(far.t / 2));

  // Pickup removes freight from the total AND from the deposit.
  await page.click('[data-fulfill="pickup"]');
  const pickup = await page.evaluate(() => ({ t: grandTotal(), d: depositAmount(), f: freight() }));
  expect(pickup.f).toBe(0);
  expect(pickup.t).toBe(46440);
  expect(pickup.d).toBe(23220);
});

test('the salt water system is gone from the page, the assets and the order', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await expect(page.locator('[data-upg]')).toHaveCount(2);
  await expect(page.locator('[data-upg="salt"]')).toHaveCount(0);

  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toMatch(/salt/i);
  expect(body).not.toContain('$1,977');

  const src = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  expect(src).not.toMatch(/salt/i);
  expect(src).not.toContain('1977');
  expect(fs.existsSync(path.resolve(__dirname, 'assets/img/upgrades/salt-system.svg'))).toBe(false);
});

test('both heater cards show real photographs that actually load', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);

  for (const id of ['heat-pump', 'gas-heater']) {
    const img = page.locator(`[data-upg="${id}"] img`).first();
    const src = await img.getAttribute('src');
    expect(src, `${id} must use a photograph, not placeholder art`).toMatch(/\.jpe?g$/i);
    const loaded = await img.evaluate(el => el.complete && el.naturalWidth > 0);
    expect(loaded, `${id} image must render`).toBe(true);
  }
  const files = fs.readdirSync(path.resolve(__dirname, 'assets/img/upgrades'));
  expect(files.filter(f => f.endsWith('.svg'))).toEqual([]);
});

test('payments are ACH and financing only, and financing points at the MCP promo page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await fillStep2(page);
  await page.click('[data-continue]');
  await page.click('[data-continue]');

  await expect(page.locator('[data-pm]')).toHaveCount(2);
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toMatch(/zelle|bank wire|mailed check|credit \/ debit/i);

  await page.click('[data-pm="financing"]');
  await expect(page.locator(`a[href="${HFS_PROMO}"]`)).toBeVisible();
  // The bare homepage is not the attributed application path.
  await expect(page.locator('a[href="https://www.hfsfinancial.net/"]')).toHaveCount(0);

  const src = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  expect(src).not.toMatch(/routing number|account number/i);
});

test('the non-refundable deposit is disclosed before the buyer consents', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await fillStep2(page);
  await page.click('[data-continue]');

  // Articles 6 and 19 make the deposit non-refundable. The buyer must read that
  // on the review step, before the consent checkbox on step 4.
  await expect(page.locator('#stepRoot')).toContainText('non-refundable');
  const src = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  expect(src).not.toMatch(/deposit is refundable|refundable per terms/i);
});

test('sales tax: Kansas only, never added to a total', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');

  // Kansas City MO is 64108 - one prefix off Kansas, and a common way to get
  // this wrong. It must read as out-of-state.
  await fillStep2(page, { zip: '64108' });
  await page.click('[data-fulfill="delivery"]');
  await page.click('[data-continue]');
  await expect(page.locator('#taxNotice')).toContainText('does not include sales tax');
  await expect(page.locator('#stepRoot')).toContainText('Not collected');
  const outOfState = await page.evaluate(() => ({ t: grandTotal(), s: subtotal(), f: freight() }));
  expect(outOfState.t).toBe(outOfState.s + outOfState.f);

  // A Kansas delivery gets the Kansas line instead.
  await page.click('[data-edit-step="2"]');
  await page.fill('#zip3', '66048');
  await page.click('#recalcBtn');
  await page.click('[data-continue]');
  await expect(page.locator('#taxNotice')).toContainText('Kansas sales tax applies');
  await expect(page.locator('#stepRoot')).toContainText('Added to your final invoice');

  // Pickup hands the pool over in Leavenworth, so a California buyer still takes
  // possession in Kansas - they must not be told tax is not collected.
  await page.click('[data-edit-step="2"]');
  await page.fill('#zip3', '90210');
  await page.click('#recalcBtn');
  await page.click('[data-fulfill="pickup"]');
  await page.click('[data-continue]');
  await expect(page.locator('#taxNotice')).toContainText('Kansas sales tax applies');

  // Whatever the case, tax is settled on the invoice - it never enters a total.
  const ks = await page.evaluate(() => ({ t: grandTotal(), s: subtotal(), f: freight(), d: depositAmount() }));
  expect(ks.t).toBe(ks.s + ks.f);
  expect(ks.d).toBe(Math.round(ks.t / 2));

  await page.click('[data-continue]');
  await page.click('[data-pm="ach"]');
  await page.check('#termsChk');
  await page.click('#submitBtn');
  const order = await page.evaluate(() => JSON.parse(JSON.stringify(state.order)));
  expect(order.pricing.kansasSalesTax).toBe(true);
  expect(order.pricing.grandTotal).toBe(order.pricing.subtotal + order.pricing.freightAmount);
});

test('freight tracks real geography and is declined where MCP will not haul', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');

  await expect(page.locator('#shipAmt')).toHaveText('—');
  const deliveryTile = page.locator('[data-fulfill="delivery"]');
  await expect(deliveryTile).toContainText('—');
  await expect(deliveryTile).not.toContainText('$0');

  await page.fill('#zip3', '64108');
  await page.click('#recalcBtn');
  await expect(page.locator('#shipMeta')).toContainText('~35 mi');
  await expect(page.locator('#shipAmt')).toHaveText('$170');

  const amountFor = async zip => {
    await page.fill('#zip3', zip);
    await page.click('#recalcBtn');
    return money(await page.locator('#shipAmt').textContent());
  };
  const chicago = await amountFor('60601');
  const losAngeles = await amountFor('90210');
  const boston = await amountFor('02101');
  expect(chicago).toBeGreaterThan(1500);
  expect(losAngeles).toBeGreaterThan(boston);
  expect(losAngeles).toBeGreaterThan(chicago * 2);

  await page.fill('#zip3', '96801'); // Honolulu
  await page.click('#recalcBtn');
  await expect(page.locator('#shipAmt')).toHaveText('—');
  await expect(page.locator('#shipMeta')).toContainText('Outside our flatbed delivery area');
  // A route we decline must not silently price at zero and get halved into a deposit.
  expect(await page.evaluate(() => freight())).toBe(0);

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

  await page.click('[data-continue]');
  await expect(page.locator('#gateMsg')).toBeVisible();
  await expect(page.locator('#stepLabel')).toHaveText('Step 1 of 4');

  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');

  await page.click('[data-continue]');
  await expect(page.locator('#step2Msg')).toContainText('5-digit destination ZIP');
  await expect(page.locator('#zip3')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#zip3')).toBeFocused();

  await fillStep2(page, { phone: '5' });
  await page.click('[data-continue]');
  await expect(page.locator('#step2Msg')).toContainText('10-digit phone number');
  await expect(page.locator('#f-phone')).toHaveAttribute('aria-invalid', 'true');

  await fillStep2(page, { email: 'buyer@example' });
  await page.click('[data-continue]');
  await expect(page.locator('#step2Msg')).toContainText('valid email');
  await expect(page.locator('#f-email')).toHaveAttribute('aria-invalid', 'true');

  await fillStep2(page);
  await page.click('[data-continue]');
  await expect(page.locator('#stepLabel')).toHaveText('Step 3 of 4');
});

test('custom color is a Sherwin-Williams swatch, not a hex field, and it gates step 1', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-install="above"]');

  // The hex input is gone.
  await expect(page.locator('#hexInput')).toHaveCount(0);

  await page.click('[data-color="custom"]');
  await expect(page.locator('#swGrid')).toBeVisible();
  expect(await page.locator('#swGrid [data-sw]').count()).toBeGreaterThan(1000);

  // Choosing "custom" without picking a swatch must not advance.
  await page.click('[data-continue]');
  await expect(page.locator('#gateMsg')).toBeVisible();
  await expect(page.locator('#stepLabel')).toHaveText('Step 1 of 4');

  // 1,526 swatches must not become 1,526 tab stops.
  expect(await page.locator('#swGrid [data-sw][tabindex="0"]').count()).toBe(1);

  // Search narrows without rebuilding, and a pick names the color.
  await page.fill('#swSearch', 'Naval');
  await expect(page.locator('#swCount')).toContainText('match');
  const visible = page.locator('#swGrid [data-sw]:not(.hidden)');
  expect(await visible.count()).toBeGreaterThan(0);
  await visible.first().click();
  await expect(page.locator('#swSelected')).toContainText('SW');

  await page.click('[data-continue]');
  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');
  await expect(page.locator('#railBody')).toContainText('SW');
  // Colour is included at MCP, so no fee may appear.
  await expect(page.locator('#railBody')).not.toContainText('$499');
});

test('the "No upgrades" card is gone and choosing nothing is simply nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await expect(page.locator('[data-noupg]')).toHaveCount(0);
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toMatch(/no upgrades/i);

  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await fillStep2(page);
  await page.click('[data-continue]');
  await expect(page.locator('#stepRoot')).not.toContainText('None selected');
  await expect(page.locator('#stepRoot')).toContainText('$46,440');
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

  await page.click('[data-edit-step="2"]');
  await expect(page.locator('#stepLabel')).toHaveText('Step 2 of 4');
  await expect(page.locator('#f-email')).toHaveValue('dana@example.com');
});

test('submitted order records freight, the 50% split, and claims no payment capture', async ({ page }) => {
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
  await page.click('[data-pm="ach"]');

  // Terms are required: submitting unchecked must not produce an order.
  await page.click('#submitBtn');
  await expect(page.locator('#payMsg')).toBeVisible();
  expect(await page.locator('#thankYouHeading').count()).toBe(0);
  expect(await page.evaluate(() => window.state && state.order)).toBeFalsy();

  await page.check('#termsChk');
  await page.click('#submitBtn');
  await expect(page.locator('#thankYouHeading')).toBeVisible();

  const order = await page.evaluate(() => JSON.parse(JSON.stringify(state.order)));
  expect(order.config.baseModel).toBe('40ft');
  expect(order.config.basePrice).toBe(68790);
  expect(order.config.colorName).toBe('Charcoal');

  expect(order.pricing.subtotal).toBe(71944);
  expect(order.pricing.freightAmount).toBe(FREIGHT['66048']);
  expect(order.pricing.grandTotal).toBe(71944 + FREIGHT['66048']);
  expect(order.pricing.depositRate).toBe(0.5);
  expect(order.pricing.depositAmount + order.pricing.balanceAmount).toBe(order.pricing.grandTotal);
  expect(order.pricing.depositRefundable).toBe(false);
  expect(order.shipping.includedInTotal).toBe(true);
  expect(order.shipping.quotedAmount).toBe(FREIGHT['66048']);

  expect(order.consent.termsAccepted).toBe(true);
  expect(order.consent.termsVersion).toBe('2.0');

  // Nothing is wired to a processor, so nothing may claim a capture.
  expect(order.status).toBe('submitted');
  expect(order.payment.method).toBe('ach');
  expect(order.payment.depositCaptured).toBe(false);
  expect(order.payment.processorRef).toBeNull();
  expect(order.payment.processorStatus).toBe('awaiting_processor');
  // No processor is wired, so MCP reconciles incoming ACH by this reference.
  // It must be a real MCP- reference and it must reach the buyer.
  expect(order.payment.buyerReference).toMatch(/^MCP-[A-Z0-9]{5}-\d{4}$/);

  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toMatch(/deposit paid|order placed|build is scheduled/i);
  expect(body).toContain(order.orderId);
  expect(body).toContain(order.payment.buyerReference);
  expect(order.orderId.startsWith('MCP-')).toBe(true);
  // The confirmation must restate the recorded figures, not recompute them.
  expect(body).toContain('$72,065');
  expect(body).toContain('$36,033');

  await page.screenshot({ path: shot('desktop-confirmation.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('pickup orders carry no freight anywhere in the record', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });
  await openWizard(page);
  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await fillStep2(page, { zip: '90210' });
  await page.click('[data-fulfill="pickup"]');
  await page.click('[data-continue]');
  await page.click('[data-continue]');
  await page.click('[data-pm="ach"]');
  await page.check('#termsChk');
  await page.click('#submitBtn');
  const order = await page.evaluate(() => JSON.parse(JSON.stringify(state.order)));
  expect(order.shipping.fulfillment).toBe('pickup');
  expect(order.shipping.includedInTotal).toBe(false);
  expect(order.shipping.quotedAmount).toBe(0);
  expect(order.shipping.distanceMiles).toBe(0);
  expect(order.pricing.freightAmount).toBe(0);
  expect(order.pricing.grandTotal).toBe(order.pricing.subtotal);
});

test('mobile: the bar tracks BOTH the order total and the deposit, and nothing overflows', async ({ page }) => {
  const errors = [];
  watchConsole(page, errors);
  await page.setViewportSize({ width: 375, height: 812 });
  await openWizard(page);
  await page.click('[data-model="20ft"]');
  await expect(page.locator('#mobileBarSubtotal')).toHaveText('$46,440');
  await expect(page.locator('#mobileBarDeposit')).toHaveText('$23,220');

  // The deposit used to be literal markup that could never move. It must now.
  await page.click('[data-upg="heat-pump"]');
  await expect(page.locator('#mobileBarSubtotal')).toHaveText('$51,096');
  await expect(page.locator('#mobileBarDeposit')).toHaveText('$25,548');

  await page.click('#viewOrderBtn');
  await expect(page.locator('#drawerBody')).toContainText('$51,096');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobileDrawer')).not.toHaveClass(/open/);

  await page.click('[data-color="white"]');
  await page.click('[data-install="partial"]');
  await page.screenshot({ path: shot('mobile-step1-design.png'), fullPage: true });
  await page.click('[data-continue]');

  // A delivery ZIP must move the mobile deposit too, because freight is in the total.
  await fillStep2(page, { zip: '64108', name: 'Mobile Buyer', addr: '5 Elm St, Kansas City, MO', phone: '9135550188', email: 'mobile@example.com' });
  await page.click('[data-fulfill="delivery"]');
  await expect(page.locator('#mobileBarSubtotal')).toHaveText('$51,266');
  await expect(page.locator('#mobileBarDeposit')).toHaveText('$25,633');
  await noOverflow(page);

  await page.click('[data-continue]');
  await expect(page.locator('#stepRoot')).toContainText('$51,266');
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

  await page.locator('.chatBtn').first().click();
  await expect(page.locator('#chatPop')).toBeVisible();
  await sweep('chat popover');
  await expect(page.locator('#chatPop')).not.toContainText(/^RP$/);
  await page.locator('.chatBtn').first().click();

  // The color picker came from the Ready Pool build - sweep it open.
  await page.click('[data-color="custom"]');
  await expect(page.locator('#swGrid')).toBeVisible();
  await sweep('color picker');

  await page.click('[data-color="slate"]');
  await page.click('[data-install="above"]');
  await page.click('[data-continue]');
  await sweep('step 2');
  await fillStep2(page, { zip: '66048', name: 'Test Buyer', addr: '1 A Street, Leavenworth KS', phone: '9135550000', email: 't@example.com' });
  await page.click('[data-continue]');
  await sweep('step 3');
  await page.click('[data-continue]');
  for (const pm of ['ach', 'financing']) {
    await page.click(`[data-pm="${pm}"]`);
    await sweep(`payment panel ${pm}`);
  }

  await page.click('[data-pm="ach"]');
  await page.check('#termsChk');
  await page.click('#submitBtn');
  await expect(page.locator('#thankYouHeading')).toBeVisible();
  await sweep('confirmation');

  // And the source itself, which is public on a single-file build. The one
  // allowed mention is the engineering comment recording why freight has a
  // single source; strip that line before sweeping.
  const src = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8')
    .replace(/^.*Ready Pool reviews caught twice.*$/m, '');
  const srcHit = firstBanned(src);
  expect(srcHit, `banned identity in the shipped source: ${srcHit}`).toBeNull();
  expect(src).not.toMatch(/keeps the spread|broker runs|NOTE FOR ENGINEERING|IBG-drafted/i);
});

test('the Terms PDF is generated from the approved .docx and matches what the order records', async () => {
  const dir = path.resolve(__dirname, 'assets/terms');
  const pdf = path.join(dir, 'Midwest-Container-Pools-Terms-and-Conditions.pdf');
  const docx = path.join(dir, 'MidwestContainerPools_Terms_and_Conditions.docx');

  expect(fs.existsSync(pdf), 'Terms PDF must be committed').toBe(true);
  expect(fs.readFileSync(pdf).slice(0, 5).toString()).toBe('%PDF-');
  expect(fs.existsSync(docx), "MCP's approved .docx must be committed beside the generator").toBe(true);
  expect(fs.readFileSync(docx).slice(0, 2).toString()).toBe('PK');

  const gen = fs.readFileSync(path.join(dir, 'make-terms-pdf.py'), 'utf8');
  // The generator must READ the contract, never restate it - that is what stops
  // the published PDF drifting from what the client actually approved.
  expect(gen).toContain('MidwestContainerPools_Terms_and_Conditions.docx');
  expect(gen).toMatch(/read_docx_paragraphs/);
  expect(gen).not.toMatch(/A non-refundable Deposit is required/i);

  const src = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  const genVersion = gen.match(/^VERSION = "([^"]+)"/m)[1];
  const htmlVersion = src.match(/TERMS_VERSION = '([^']+)'/)[1];
  expect(htmlVersion, 'index.html TERMS_VERSION must match the generator').toBe(genVersion);
  expect(genVersion).toBe('2.0');

  // The checkout must not contradict the contract it links.
  expect(src).not.toMatch(/deposit is refundable/i);
  expect(src).toContain(TERMS_PHONE);
  expect(src).toContain(TERMS_EMAIL);
});
