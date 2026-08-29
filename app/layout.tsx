import './globals.css';
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { PwaRegister } from '@/components/pwa-register';
import { RouteProgress } from '@/components/route-progress';

export const metadata: Metadata = {
  title: 'Aeromax Notes — Smart Event CRM',
  description: 'Aplikasi pencatatan dan analisis pemasaran event B2B Aeromax',
  applicationName: 'Aeromax Notes',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Aeromax Notes',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f7f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1510' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Aeromax Notes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="selection:bg-emerald-500 selection:text-white">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}


