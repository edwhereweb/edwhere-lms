import { PublicNavbar } from '@/components/public-navbar';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <PublicNavbar />
            <main className="flex-1">{children}</main>
            {/* Footer */}
            <footer className="bg-[#F7F7F7]">
                <div className="max-w-7xl mx-auto px-6 py-10">
                    <div className="flex flex-col items-center gap-8">
                        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-inter font-medium text-[#232228]">
                            <span>Edwhere Learning &copy; {new Date().getFullYear()}</span>
                            <span className="text-gray-300">|</span>
                            <Link href="#" className="transition-colors hover:text-[#F80602]">
                                Privacy policy
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link href="#" className="transition-colors hover:text-[#F80602]">
                                Terms of use
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link href="/contact" className="transition-colors hover:text-[#F80602]">
                                Contact us
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link href="#" className="transition-colors hover:text-[#F80602]">
                                Refund policy
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
