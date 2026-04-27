import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Milkow',
    short_name: 'Milkow',
    description: 'Milkow Fresh | Distribution Management',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffffff',
    theme_color: '#09090b',
    orientation: 'portrait',
    icons: [
      {
        src: '/assets/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/assets/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
