'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface PublicSearchBarProps {
    defaultValue?: string;
}

export const PublicSearchBar = ({ defaultValue }: PublicSearchBarProps) => {
    const [value, setValue] = useState(defaultValue || '');
    const debouncedValue = useDebounce(value, 500);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedValue) {
            params.set('q', debouncedValue);
        } else {
            params.delete('q');
        }
        router.push(`/courses?${params.toString()}`);
    }, [debouncedValue, router, searchParams]);

    return (
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
                type="text"
                placeholder="Search for courses..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white text-black rounded-xl border-0 text-base font-inter shadow-lg focus:outline-none focus:ring-2 focus:ring-[#6715FF] placeholder:text-gray-400"
            />
        </div>
    );
};
