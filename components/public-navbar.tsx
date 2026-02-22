'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const NAV_LINKS = [
  { label: 'Courses', href: '/search' },
  { label: 'About Us', href: 'https://edwhere.com/about-us/' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Webinars', href: '#' }
];

export const PublicNavbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 py-2">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/edwhere-logo.png" alt="Edwhere" width={44} height={44} className="rounded" />
        </Link>

        <div className="hidden md:flex lg:flex items-center border border-[#E5E5E5] rounded px-3 py-2 w-72 mx-6">
          <Search className="h-4 w-4 text-[#ACB3C2] mr-2 shrink-0" />
          <span className="text-sm text-[#ACB3C2] font-inter">Search</span>
        </div>

        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`px-3 py-2.5 text-sm font-medium font-inter capitalize transition-colors hover:text-[#EC4130] ${
                pathname === link.href ? 'text-[#EC4130]' : 'text-[#1F1F1F]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            className="ml-3 px-5 py-2 text-sm font-semibold font-inter text-white bg-[#171717] rounded transition-all hover:bg-[#EC4130] hover:shadow-md"
          >
            Login
          </Link>
        </nav>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger className="lg:hidden p-2 hover:opacity-75 transition">
            <Menu className="h-6 w-6 text-[#1F1F1F]" />
          </SheetTrigger>
          <SheetContent side="left" className="p-6 bg-white flex flex-col gap-y-6 lg:hidden w-64">
            <div className="flex items-center justify-center border-b pb-4">
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
                  className={`text-base font-medium font-inter transition-colors hover:text-[#EC4130] ${
                    pathname === link.href ? 'text-[#EC4130]' : 'text-[#1F1F1F]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t pt-4">
                <Link
                  href="/sign-in"
                  className="w-full inline-flex justify-center px-5 py-2.5 text-sm font-semibold font-inter text-white bg-[#171717] rounded transition-all hover:bg-[#EC4130] hover:shadow-md"
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
