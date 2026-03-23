'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const NAV_LINKS = [
  { label: 'Courses', href: '/courses' },
  { label: 'About Us', href: 'https://edwhere.com/about-us/' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Webinars', href: '#' }
];

type PublicNavbarProps = {
  supportsDarkTheme?: boolean;
};

export const PublicNavbar = ({ supportsDarkTheme = false }: PublicNavbarProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 border-b ${
        supportsDarkTheme
          ? 'border-gray-100 bg-white dark:border-zinc-800 dark:bg-zinc-950'
          : 'border-gray-100 bg-white'
      }`}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 py-2">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/edwhere-logo.png" alt="Edwhere" width={44} height={44} className="rounded" />
        </Link>

        <div
          className={`mx-6 hidden w-72 items-center rounded border px-3 py-2 md:flex lg:flex ${
            supportsDarkTheme ? 'border-[#E5E5E5] dark:border-zinc-800' : 'border-[#E5E5E5]'
          }`}
        >
          <Search
            className={`mr-2 h-4 w-4 shrink-0 ${
              supportsDarkTheme ? 'text-[#ACB3C2] dark:text-zinc-500' : 'text-[#ACB3C2]'
            }`}
          />
          <span
            className={`font-inter text-sm ${
              supportsDarkTheme ? 'text-[#ACB3C2] dark:text-zinc-500' : 'text-[#ACB3C2]'
            }`}
          >
            Search
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`px-3 py-2.5 text-sm font-medium font-inter capitalize transition-colors hover:text-[#F80602] ${
                pathname === link.href
                  ? 'text-[#F80602]'
                  : supportsDarkTheme
                    ? 'text-[#1F1F1F] dark:text-zinc-100'
                    : 'text-[#1F1F1F]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            className="ml-3 px-5 py-2 text-sm font-semibold font-inter text-white bg-[#171717] rounded transition-all hover:bg-[#F80602] hover:shadow-md"
          >
            Login
          </Link>
        </nav>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger className="p-2 transition hover:opacity-75 lg:hidden">
            <Menu
              className={`h-6 w-6 ${supportsDarkTheme ? 'text-[#1F1F1F] dark:text-zinc-100' : 'text-[#1F1F1F]'}`}
            />
          </SheetTrigger>
          <SheetContent
            side="left"
            className={`flex w-64 flex-col gap-y-6 p-6 lg:hidden ${
              supportsDarkTheme ? 'bg-white dark:bg-zinc-950' : 'bg-white'
            }`}
          >
            <div
              className={`flex items-center justify-center border-b pb-4 ${
                supportsDarkTheme ? 'border-gray-200 dark:border-zinc-800' : 'border-gray-200'
              }`}
            >
              <Image
                src="/edwhere-logo.png"
                alt="Edwhere"
                width={80}
                height={80}
                className="rounded"
              />
            </div>
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-base font-medium font-inter transition-colors hover:text-[#F80602] ${
                    pathname === link.href
                      ? 'text-[#F80602]'
                      : supportsDarkTheme
                        ? 'text-[#1F1F1F] dark:text-zinc-100'
                        : 'text-[#1F1F1F]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div
                className={`pt-4 ${supportsDarkTheme ? 'border-t border-gray-200 dark:border-zinc-800' : 'border-t border-gray-200'}`}
              >
                <Link
                  href="/sign-in"
                  className="w-full inline-flex justify-center px-5 py-2.5 text-sm font-semibold font-inter text-white bg-[#171717] rounded transition-all hover:bg-[#F80602] hover:shadow-md"
                >
                  Login
                </Link>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
