'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type Category } from '@prisma/client';

interface PublicCategoryFilterProps {
    categories: Category[];
    selectedCategoryId?: string;
    hasUncategorized: boolean;
}

export const PublicCategoryFilter = ({
    categories,
    selectedCategoryId,
    hasUncategorized
}: PublicCategoryFilterProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const allCategories = hasUncategorized
        ? [
            { id: 'uncategorized', name: 'Uncategorized', createdAt: new Date(), updatedAt: new Date() },
            ...categories
        ]
        : categories;

    const handleClick = (categoryId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (categoryId === selectedCategoryId) {
            params.delete('categoryId');
        } else {
            params.set('categoryId', categoryId);
        }
        router.push(`/courses?${params.toString()}`);
    };

    return (
        <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => {
                const isSelected = category.id === selectedCategoryId;
                return (
                    <button
                        key={category.id}
                        onClick={() => handleClick(category.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium font-inter transition-all border ${isSelected
                                ? 'bg-[#6715FF] text-white border-[#6715FF] shadow-md'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-[#6715FF] hover:text-[#6715FF]'
                            }`}
                    >
                        {category.name}
                    </button>
                );
            })}
        </div>
    );
};
