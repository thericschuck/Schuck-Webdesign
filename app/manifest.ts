import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Schuck Webdesign – Kundenportal',
    short_name: 'SW Portal',
    description: 'Dein persönlicher Projektzugang bei Schuck Webdesign',
    start_url: '/portal',
    scope: '/portal',
    display: 'standalone',
    background_color: '#080808',
    theme_color: '#080808',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '400x400',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '400x400',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
