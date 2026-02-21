import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Poppins, Open_Sans } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/providers/toaster-provider';
import ThemeSwitch from '@/components/theme-switch';
import ThemeContextProvider from '@/components/providers/theme-provider';
import { ConfettiProvider } from '@/components/providers/confetti-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins'
});
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-opensans'
});

export const metadata: Metadata = {
  title: {
    default: 'Edwhere LMS',
    template: '%s | Edwhere LMS'
  },
  description: 'A modern learning management system for seamless course delivery and management.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${inter.variable} ${poppins.variable} ${openSans.variable} ${inter.className}`}
        >
          <ThemeContextProvider>
            <ConfettiProvider />
            <ToastProvider />
            {children}
            <ThemeSwitch />
          </ThemeContextProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
