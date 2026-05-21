import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UIGen DevBoard',
  description: 'Generic hardware demo with board lab and OpenAPI-driven admin UI',
  icons: {
    icon: '/assets/uigen-hardware-logo.svg',
    apple: '/assets/uigen-hardware-logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
