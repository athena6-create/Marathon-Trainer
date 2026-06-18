import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Running Coach',
  description: 'Personalized running and strength training coach app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-50 to-slate-100">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
