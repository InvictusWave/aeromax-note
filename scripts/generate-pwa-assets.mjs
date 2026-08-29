import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { chromium } from 'playwright-core';

mkdirSync(resolve('public/icons'), { recursive: true });

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b130e"/>
      <stop offset="50%" stop-color="#121e16"/>
      <stop offset="100%" stop-color="#070c09"/>
    </linearGradient>

    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.6"/>
      <stop offset="40%" stop-color="#10b981" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#a3e635" stop-opacity="0.4"/>
    </linearGradient>

    <linearGradient id="leftWing" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>

    <linearGradient id="rightWing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#84cc16"/>
      <stop offset="60%" stop-color="#a3e635"/>
      <stop offset="100%" stop-color="#d9f99d"/>
    </linearGradient>

    <linearGradient id="coreGrad" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#d9f99d"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#10b981" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="512" height="512" rx="128" fill="url(#bgGrad)"/>
  <rect width="508" height="508" x="2" y="2" rx="126" fill="none" stroke="url(#borderGrad)" stroke-width="3" stroke-opacity="0.7"/>

  <circle cx="256" cy="220" r="140" fill="#10b981" fill-opacity="0.08" filter="blur(40px)"/>
  <circle cx="280" cy="280" r="100" fill="#a3e635" fill-opacity="0.06" filter="blur(30px)"/>

  <g filter="url(#glow)">
    <path d="M256 96 L124 372 C120 380 126 388 135 388 L196 388 C204 388 211 383 214 376 L256 280 L298 376 C301 383 308 388 316 388 L377 388 C386 388 392 380 388 372 L256 96 Z" fill="#0d1f14" opacity="0.95"/>
    <path d="M256 96 L135 388 L206 388 L256 270 L256 96 Z" fill="url(#leftWing)"/>
    <path d="M256 96 L256 270 L306 388 L377 388 L256 96 Z" fill="url(#rightWing)"/>
    <path d="M192 312 L320 312 L302 274 L210 274 Z" fill="url(#coreGrad)"/>
    <path d="M256 96 L238 184 L256 196 L274 184 Z" fill="#ffffff" opacity="0.9"/>
  </g>
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b130e"/>
      <stop offset="50%" stop-color="#121e16"/>
      <stop offset="100%" stop-color="#070c09"/>
    </linearGradient>
    <linearGradient id="leftWingM" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
    <linearGradient id="rightWingM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#84cc16"/>
      <stop offset="60%" stop-color="#a3e635"/>
      <stop offset="100%" stop-color="#d9f99d"/>
    </linearGradient>
    <linearGradient id="coreGradM" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#d9f99d"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <filter id="glowM" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#10b981" flood-opacity="0.3"/>
    </filter>
  </defs>

  <rect width="512" height="512" fill="url(#bgGradM)"/>

  <g transform="translate(51.2, 51.2) scale(0.8)" filter="url(#glowM)">
    <path d="M256 96 L135 388 L206 388 L256 270 L256 96 Z" fill="url(#leftWingM)"/>
    <path d="M256 96 L256 270 L306 388 L377 388 L256 96 Z" fill="url(#rightWingM)"/>
    <path d="M192 312 L320 312 L302 274 L210 274 Z" fill="url(#coreGradM)"/>
    <path d="M256 96 L238 184 L256 196 L274 184 Z" fill="#ffffff" opacity="0.9"/>
  </g>
</svg>`;

writeFileSync(resolve('public/icon.svg'), logoSvg);
writeFileSync(resolve('app/icon.svg'), logoSvg);

console.log('Saved SVG icon templates. Generating PNGs with Chromium...');

async function generatePngs() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const page = await browser.newPage();

  async function renderSvgToPng(svgString, width, height, outputPath) {
    await page.setViewportSize({ width, height });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
            svg { width: 100%; height: 100%; display: block; }
          </style>
        </head>
        <body>
          ${svgString}
        </body>
      </html>
    `);
    await page.screenshot({ path: outputPath, omitBackground: true });
    console.log(`Generated: ${outputPath} (${width}x${height})`);
  }

  await renderSvgToPng(logoSvg, 192, 192, resolve('public/icons/icon-192.png'));
  await renderSvgToPng(logoSvg, 512, 512, resolve('public/icons/icon-512.png'));
  await renderSvgToPng(maskableSvg, 512, 512, resolve('public/icons/icon-maskable.png'));
  await renderSvgToPng(logoSvg, 180, 180, resolve('public/apple-touch-icon.png'));
  await renderSvgToPng(logoSvg, 180, 180, resolve('public/icons/apple-touch-icon.png'));
  await renderSvgToPng(logoSvg, 48, 48, resolve('public/favicon.png'));
  await renderSvgToPng(logoSvg, 64, 64, resolve('public/favicon.ico'));

  await browser.close();
  console.log('All PWA icons generated successfully!');
}

generatePngs().catch(console.error);
