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
page.setDefaultTimeout(90_000);

const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Nama pengguna').fill(username);
  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL('**/dashboard');

  await page.goto(`${baseUrl}/ai`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Aeromax AI' }).waitFor();

  const composer = page.getByLabel('Pesan untuk Aeromax AI');
  await composer.fill('Berapa total event dan kontak Aeromax? Jawab satu kalimat.');
  const chatStarted = Date.now();
  const chatResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/ai') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Kirim pesan' }).evaluate(button => button.click());
  const chatResponse = await chatResponsePromise;
  const chatBody = await chatResponse.json();
  await page.getByText(chatBody.text, { exact: true }).waitFor();
  const chatDuration = Date.now() - chatStarted;
  await page.screenshot({ path: '/private/tmp/aeromax-ai-chat-mobile.png', fullPage: true });

  await page.getByRole('tab', { name: 'Saran & Analisis' }).evaluate(tab => tab.click());
  await page.getByText('Analisis lanjutan', { exact: true }).waitFor();
  const analysisStarted = Date.now();
  const analysisResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/ai') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Prioritas follow-up/ }).evaluate(button => button.click());
  const analysisResponse = await analysisResponsePromise;
  const analysisBody = await analysisResponse.json();
  await page.getByText('Gemini sedang membaca catatan...').waitFor({ state: 'hidden' });
  await page.screenshot({ path: '/private/tmp/aeromax-ai-analysis-mobile.png', fullPage: true });

  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bottomNavigationItems: document.querySelectorAll('nav.fixed a').length,
    activeAi: [...document.querySelectorAll('nav.fixed a')].some(link => link.textContent?.trim() === 'AI' && link.className.includes('bg-ink')),
  }));

  const result = {
    chat: { status: chatResponse.status(), model: chatBody.model, durasiMs: chatDuration, text: chatBody.text },
    analysis: { status: analysisResponse.status(), model: analysisBody.model, durasiMs: Date.now() - analysisStarted },
    layout,
    pageErrors,
  };
  console.log(JSON.stringify(result, null, 2));

  if (chatResponse.status() !== 200
    || analysisResponse.status() !== 200
    || !String(chatBody.model).includes('2.5')
    || !(/2\.5|3\./).test(String(analysisBody.model))
    || layout.documentWidth > layout.viewport
    || layout.bottomNavigationItems !== 4
    || !layout.activeAi
    || pageErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
