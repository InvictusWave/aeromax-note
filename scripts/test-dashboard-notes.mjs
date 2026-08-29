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

const apiGets = [];
const pageErrors = [];
const clickDirectly = locator => locator.evaluate(element => element.click());
const measureClientNavigation = (path, heading) => page.evaluate(({ path, heading }) => new Promise((resolve, reject) => {
  const started = performance.now();
  const timeout = window.setTimeout(() => {
    window.clearInterval(check);
    reject(new Error(`Navigasi ke ${path} melebihi batas waktu`));
  }, 10_000);
  const check = window.setInterval(() => {
    const currentHeading = document.querySelector('h1')?.textContent?.trim();
    if (window.location.pathname === path && currentHeading === heading) {
      window.clearTimeout(timeout);
      window.clearInterval(check);
      resolve(Math.round(performance.now() - started));
    }
  }, 16);
  const links = [...document.querySelectorAll(`a[href="${path}"]`)];
  links.at(-1)?.click();
}), { path, heading });
page.on('response', response => {
  if (response.url().endsWith('/api/events') && response.request().method() === 'GET') {
    apiGets.push(response.status());
    console.log(`GET /api/events: ${response.status()}`);
  }
});
page.on('pageerror', error => {
  pageErrors.push(error.message);
  console.log(`Kesalahan halaman: ${error.message}`);
});
page.on('requestfailed', request => console.log(`Request gagal: ${request.url()} ${request.failure()?.errorText}`));

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Nama pengguna').fill(username);
  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL('**/dashboard');

  await page.waitForTimeout(2_000);
  console.log(`Dasbor: ${page.url()} | ${(await page.locator('body').innerText()).slice(0, 140).replaceAll('\n', ' | ')}`);
  await page.getByText('Total event', { exact: true }).waitFor();
  const metric = page.getByText('Total event', { exact: true }).locator('..').locator('..');
  const metricStyle = await metric.evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, classes: element.className };
  });
  await page.screenshot({ path: '/private/tmp/aeromax-dashboard-mobile.png', fullPage: true });

  const toNotesStarted = Date.now();
  await clickDirectly(page.getByRole('link', { name: 'Catatan', exact: true }).last());
  await page.waitForURL('**/notes');
  await page.getByText(/catatan ditemukan/).waitFor();
  const toNotesMs = Date.now() - toNotesStarted;

  const mobileLayout = await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')].map(element => element.getBoundingClientRect());
    return {
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      filterBertumpuk: selects.length >= 2 && selects[1].top > selects[0].bottom,
      tombolTerlaluKecil: [...document.querySelectorAll('button, a')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.height < 40;
      }).length,
    };
  });
  await page.screenshot({ path: '/private/tmp/aeromax-notes-mobile.png', fullPage: true });

  const toDashboardStarted = Date.now();
  await clickDirectly(page.getByRole('link', { name: 'Dasbor', exact: true }).last());
  await page.waitForURL('**/dashboard');
  await page.getByText('Total event', { exact: true }).waitFor();
  const toDashboardMs = Date.now() - toDashboardStarted;

  const warmNotesMs = await measureClientNavigation('/notes', 'Catatan');
  const warmDashboardMs = await measureClientNavigation('/dashboard', 'Dasbor');

  const result = {
    metricStyle,
    mobileLayout,
    navigasi: {
      pertamaKeCatatanMs: toNotesMs,
      pertamaKeDasborMs: toDashboardMs,
      hangatKeCatatanMs: warmNotesMs,
      hangatKeDasborMs: warmDashboardMs,
      jumlahGetApi: apiGets.length,
      statusApi: apiGets,
    },
    pageErrors,
  };
  console.log(JSON.stringify(result, null, 2));

  const metricVisible = metricStyle.background === 'rgb(23, 33, 27)' && metricStyle.color === 'rgb(255, 255, 255)';
  const layoutValid = mobileLayout.documentWidth <= mobileLayout.viewport && mobileLayout.filterBertumpuk;
  if (!metricVisible || !layoutValid || apiGets.length !== 1 || pageErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
