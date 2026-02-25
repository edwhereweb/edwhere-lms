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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://learn.edwhere.com'),
  title: {
    default: 'Edwhere Education | Online Courses in Ethical Hacking, Python, and More',
    template: '%s | Edwhere Education'
  },
  description:
    'Edwhere is an EC-Council accredited center for hands-on training in Cybersecurity, Data Analytics, and AI. Get certified and ready for your dream tech career with our expert-led courses.',
  keywords: [
    'ethical hacking course',
    'python coding',
    'cybersecurity training',
    'online courses for beginners',
    'ethical hacking malayalam',
    'python malayalam',
    'edwhere education',
    'online certification programs',
    'industry expert trainings',
    'coding for beginners',
    'cybersecurity certifications',
    'hacking course kerala',
    'it security training',
    'professional development courses',
    'hands-on learning',
    'free online content',
    'student placement',
    'learn coding online'
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: 'Edwhere Education',
    title: 'Edwhere Education | Online Courses in Ethical Hacking, Python, and More',
    description:
      'Edwhere is an EC-Council accredited center for hands-on training in Cybersecurity, Data Analytics, and AI. Get certified and ready for your dream tech career with our expert-led courses.',
    images: [
      {
        url: '/edwhere-logo.png',
        width: 512,
        height: 512,
        alt: 'Edwhere Education Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Edwhere Education | Online Courses in Ethical Hacking, Python, and More',
    description:
      'Edwhere is an EC-Council accredited center for hands-on training in Cybersecurity, Data Analytics, and AI. Get certified and ready for your dream tech career with our expert-led courses.',
    images: ['/edwhere-logo.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  icons: {
    icon: '/edwhere-logo.png',
    apple: '/edwhere-logo.png'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
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
