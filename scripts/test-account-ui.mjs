import { chromium } from 'playwright-core';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const username = process.env.INITIAL_ADMIN_USERNAME;
const pin = process.env.INITIAL_ADMIN_PIN;
if (!username || !pin) throw new Error('Kredensial akun uji belum tersedia');

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
page.setDefaultTimeout(60_000);
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Nama pengguna').fill(username);
  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL('**/dashboard');

  await page.getByLabel('Buka akun').click();
  await page.waitForURL('**/account');
  await page.getByRole('heading', { name: 'Akun', exact: true }).waitFor();
  await page.getByText('Ubah PIN saya', { exact: true }).waitFor();
  await page.getByText('Tambah pengguna', { exact: true }).waitFor();
  await page.getByText('Pengguna aktif', { exact: true }).waitFor();
  await page.getByText(`@${username}`, { exact: true }).last().waitFor();

  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    inputHeights: [...document.querySelectorAll('input')].map(input => Math.round(input.getBoundingClientRect().height)),
    accountActive: [...document.querySelectorAll('a[href="/account"]')].some(link => link.className.includes('bg-ink')),
  }));
  const visibleUsernames = await page.getByText(/^@/).allTextContents();
  await page.screenshot({ path: '/private/tmp/aeromax-account-mobile.png', fullPage: true });

  console.log(JSON.stringify({ layout, visibleUsernames, pageErrors }, null, 2));
  if (layout.documentWidth > layout.viewport || layout.inputHeights.some(height => height < 44) || !layout.accountActive || visibleUsernames.length < 4 || pageErrors.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
