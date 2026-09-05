import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'منصة التعليم والبث المباشر',
  description: 'تطبيق التعليم التفاعلي والبث المباشر',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
