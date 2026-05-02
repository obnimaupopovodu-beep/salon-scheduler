import type { Metadata, Viewport } from 'next';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Salon Scheduler',
  description: 'Система записи клиентов',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Записи',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#01696f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
