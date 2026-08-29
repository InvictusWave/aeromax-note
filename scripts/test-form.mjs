import { chromium } from 'playwright-core';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const username = process.env.INITIAL_ADMIN_USERNAME;
const pin = process.env.INITIAL_ADMIN_PIN;
if (!username || !pin) throw new Error('Kredensial akun uji belum tersedia');
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  timeout: 15_000,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
// Next.js development mode can hydrate slowly on the first mobile-sized visit.
page.setDefaultTimeout(45_000);

const consoleErrors = [];
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => consoleErrors.push(`Kesalahan halaman: ${error.message}`));

try {
  console.log('1/7 Membuka halaman akses');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Nama pengguna').fill(username);
  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL('**/dashboard');
  // Respons 401 saat halaman masuk memeriksa sesi anonim adalah perilaku normal.
  consoleErrors.length = 0;
  console.log('2/7 Membuka formulir baru');
  await page.goto(`${baseUrl}/form`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);
  console.log(`URL formulir: ${page.url()}`);
  console.log(`Teks formulir: ${(await page.locator('body').innerText()).slice(0, 160).replaceAll('\n', ' | ')}`);
  console.log('3/7 Mengisi data event');
  await page.getByPlaceholder('Contoh: Indonesia Expo').fill('Uji UI iPhone Aeromax');
  await page.getByRole('button', { name: 'Pilih tanggal event' }).click();
  await page.locator('.rdp-day_button:not([disabled])').nth(12).click();
  await page.getByPlaceholder('Jakarta Convention Center').fill('ICE BSD City');
  await page.getByPlaceholder('Nama penyelenggara').fill('Aeromax Indonesia');
  await page.getByPlaceholder('Expo, konferensi, seminar...').fill('Pameran B2B');

  await page.getByRole('button', { name: /Tambah kontak/i }).click();
  await page.getByPlaceholder('Nama lengkap').fill('Dimas Saputra');
  await page.getByPlaceholder('Nama perusahaan').first().fill('PT Aviasi Indonesia');
  await page.getByPlaceholder('Jabatan').fill('Manajer Kemitraan');
  await page.getByPlaceholder('WhatsApp / email').fill('dimas@example.com');
  await page.getByPlaceholder('LinkedIn / Instagram').fill('linkedin.com/in/dimas');
  await page.locator('select[name="networking.0.potential"]').selectOption('High');
  await page.getByPlaceholder('Topik yang dibahas...').fill('Tertarik menerima katalog dan menjadwalkan pertemuan.');
  await page.getByText('Perlu follow-up').click();

  await page.getByRole('button', { name: /Tambah prospek/i }).click();
  await page.locator('input[name="prospects.0.companyName"]').fill('PT Aviasi Indonesia');
  await page.locator('input[name="prospects.0.industry"]').fill('Penerbangan');
  await page.locator('input[name="prospects.0.personMet"]').fill('Dimas Saputra');
  await page.locator('textarea[name="prospects.0.potentialSummary"]').fill('Peluang pengadaan komponen untuk kuartal berikutnya.');
  await page.locator('textarea[name="prospects.0.notes"]').fill('Kirim dokumen pada awal pekan.');
  await page.locator('input[name="nextActions"][value="Follow up"]').check();
  await page.locator('textarea[name="generalNotes"]').fill('Pengujian tambah catatan melalui tampilan iPhone.');
  console.log('4/7 Menyimpan catatan baru');
  const postResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/events') && response.request().method() === 'POST');
  await page.locator('form').evaluate(form => form.requestSubmit());
  const postResponse = await postResponsePromise;
  const postBody = await postResponse.json();
  await page.waitForURL('**/success');
  console.log(`5/7 Membuka catatan ${postBody.id} untuk diubah`);
  await page.goto(`${baseUrl}/form?edit=${postBody.id}`, { waitUntil: 'domcontentloaded' });
  const nameInput = page.locator('input[name="name"]');
  await nameInput.waitFor();
  await nameInput.fill('Uji UI iPhone Aeromax — Diubah');
  await page.locator('textarea[name="generalNotes"]').fill('Pengujian perubahan catatan melalui tampilan iPhone berhasil.');
  console.log('6/7 Menyimpan perubahan');
  const patchResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/events') && response.request().method() === 'PATCH');
  await page.locator('form').evaluate(form => form.requestSubmit());
  const patchResponse = await patchResponsePromise;
  await page.waitForURL('**/success');
  console.log('7/7 Memeriksa data hasil perubahan');
  const savedEvent = await page.evaluate(async id => {
    const response = await fetch('/api/events', { credentials: 'include', cache: 'no-store' });
    const events = await response.json();
    return events.find(event => event.id === id);
  }, postBody.id);

  const result = {
    ukuranLayar: '390x844',
    statusTambah: postResponse.status(),
    statusUbah: patchResponse.status(),
    halamanAkhir: page.url(),
    dataTersimpan: savedEvent && {
      id: savedEvent.id,
      nama: savedEvent.name,
      kontak: savedEvent.networking.length,
      prospek: savedEvent.prospects.length,
      catatan: savedEvent.generalNotes,
    },
    kesalahanKonsol: consoleErrors,
  };
  console.log(JSON.stringify(result, null, 2));

  if (postResponse.status() !== 201 || patchResponse.status() !== 200 || !savedEvent?.name.endsWith('— Diubah') || consoleErrors.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
