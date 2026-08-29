import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { chromium } from 'playwright-core';

mkdirSync(resolve('public/icons'), { recursive: true });

// Pixel-perfect SVG matching components/logo.tsx exactly
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c1610"/>
      <stop offset="50%" stop-color="#142319"/>
      <stop offset="100%" stop-color="#080e0a"/>
    </linearGradient>

    <!-- Border Glow Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.6"/>
      <stop offset="40%" stop-color="#10b981" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#a3e635" stop-opacity="0.4"/>
    </linearGradient>

    <!-- Left Wing Gradient -->
    <linearGradient id="leftWing" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>

    <!-- Right Wing Gradient -->
    <linearGradient id="rightWing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#84cc16"/>
      <stop offset="100%" stop-color="#d9f99d"/>
    </linearGradient>

    <!-- Center Core / Apex Gradient -->
    <linearGradient id="coreGrad" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#a3e635"/>
    </linearGradient>

    <!-- Drop shadow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#10b981" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)"/>
  <rect width="506" height="506" x="3" y="3" rx="125" fill="none" stroke="url(#borderGrad)" stroke-width="4" stroke-opacity="0.8"/>

  <!-- Ambient Glow -->
  <circle cx="256" cy="240" r="150" fill="#10b981" fill-opacity="0.12" filter="blur(40px)"/>

  <!-- Main Aeromax Wing Prism (Scaled to 512x512 from 64x64 grid: scale 6.5, center) -->
  <g transform="translate(48, 48) scale(6.5)" filter="url(#glow)">
    <!-- Dynamic Facets -->
    <path d="M32 12 L17 48 L26 48 L32 34 L32 12 Z" fill="url(#leftWing)" />
    <path d="M32 12 L32 34 L38 48 L47 48 L32 12 Z" fill="url(#rightWing)" />
    <path d="M24 39 L40 39 L38 34 L26 34 Z" fill="url(#coreGrad)" />
    <circle cx="32" cy="14" r="2" fill="#ffffff" />
  </g>
</svg>`;

// Maskable Icon (safe margin for Android adaptive icons)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c1610"/>
      <stop offset="50%" stop-color="#142319"/>
      <stop offset="100%" stop-color="#080e0a"/>
    </linearGradient>
    <linearGradient id="leftWingM" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
    <linearGradient id="rightWingM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#84cc16"/>
      <stop offset="100%" stop-color="#d9f99d"/>
    </linearGradient>
    <linearGradient id="coreGradM" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#a3e635"/>
    </linearGradient>
    <filter id="glowM" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#10b981" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="512" height="512" fill="url(#bgGradM)"/>

  <g transform="translate(80, 80) scale(5.5)" filter="url(#glowM)">
    <path d="M32 12 L17 48 L26 48 L32 34 L32 12 Z" fill="url(#leftWingM)" />
    <path d="M32 12 L32 34 L38 48 L47 48 L32 12 Z" fill="url(#rightWingM)" />
    <path d="M24 39 L40 39 L38 34 L26 34 Z" fill="url(#coreGradM)" />
    <circle cx="32" cy="14" r="2" fill="#ffffff" />
  </g>
</svg>`;

writeFileSync(resolve('public/icon.svg'), logoSvg);
writeFileSync(resolve('app/icon.svg'), logoSvg);

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
  await renderSvgToPng(logoSvg, 64, 64, resolve('public/favicon-64.png'));

  await browser.close();
  console.log('All PWA assets synchronized with web logo perfectly!');
}

generatePngs().catch(console.error);
