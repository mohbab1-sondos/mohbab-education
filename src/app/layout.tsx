import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Live Classroom App',
  description: 'Interactive classroom with real-time whiteboard and chat',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
