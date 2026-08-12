import { PublicNavbar } from '@/components/public-navbar';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar supportsDarkTheme />
      <main className="flex-1">{children}</main>
      {/* Footer */}
      <footer className="bg-muted border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-inter font-medium text-foreground">
              <span>Edwhere Learning &copy; {new Date().getFullYear()}</span>
              <span className="text-border">|</span>
              <Link href="#" className="transition-colors hover:text-[#F80602]">
                Privacy policy
              </Link>
              <span className="text-border">|</span>
              <Link href="#" className="transition-colors hover:text-[#F80602]">
                Terms of use
              </Link>
              <span className="text-border">|</span>
              <Link href="/contact" className="transition-colors hover:text-[#F80602]">
                Contact us
              </Link>
              <span className="text-border">|</span>
              <Link href="#" className="transition-colors hover:text-[#F80602]">
                Refund policy
              </Link>
              <span className="text-border">|</span>
              <Link href="/delete-account" className="transition-colors hover:text-[#F80602]">
                Data Deletion
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
