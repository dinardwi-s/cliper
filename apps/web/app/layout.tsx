import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI YouTube Auto Clipper',
  description: 'Turn long YouTube videos into short clips.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
