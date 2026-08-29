import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aeromax Notes — Smart Event CRM',
    short_name: 'Aeromax',
    description: 'Aplikasi pencatatan dan pemasaran event B2B Aeromax',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d1510',
    theme_color: '#132018',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    categories: ['business', 'productivity', 'utilities'],
  };
}
