export const metadata = {
  title: 'Bartender Modernized',
  description: 'Модернизированная версия клиента на App Router',
};

import Providers from './providers';
import { Inter } from 'next/font/google';
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});
import '../styles/globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}