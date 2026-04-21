import type { Metadata } from 'next';

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
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}