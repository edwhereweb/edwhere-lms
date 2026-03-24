import Image from 'next/image';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { formatPrice, stripHtml } from '@/lib/format';

interface PublicCourseCardProps {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    price: number | null;
    slug: string | null;
    category?: string | null;
    chaptersCount: number;
    instructors: { name: string; imageUrl: string | null }[];
}

export const PublicCourseCard = ({
    id,
    title,
    description,
    imageUrl,
    price,
    slug,
    category,
    chaptersCount,
    instructors
}: PublicCourseCardProps) => {
    const courseUrl = `/courses/${slug || id}`;

    return (
        <Link href={courseUrl} className="group">
            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                {/* Image */}
                <div className="relative w-full aspect-video overflow-hidden">
                    <Image
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        alt={title}
                        src={imageUrl || '/images/course-placeholder.png'}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {category && (
                        <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-semibold font-inter text-gray-700 px-3 py-1 rounded-full shadow-sm">
                            {category}
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-opensans text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-[#6715FF] transition-colors">
                        {title}
                    </h3>

                    {description && (
                        <p className="text-sm text-gray-500 font-inter mt-1 line-clamp-2 flex-1">
                            {stripHtml(description)}
                        </p>
                    )}

                    {/* Instructors */}
                    {instructors.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-3">
                            <div className="flex -space-x-2">
                                {instructors.slice(0, 3).map((inst, i) => (
                                    <div
                                        key={i}
                                        className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white overflow-hidden"
                                    >
                                        {inst.imageUrl ? (
                                            <Image
                                                src={inst.imageUrl}
                                                alt={inst.name}
                                                width={24}
                                                height={24}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-[#6715FF] flex items-center justify-center text-white text-[10px] font-bold">
                                                {inst.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs text-gray-500 font-inter truncate">
                                {instructors.map((i) => i.name).join(', ')}
                            </span>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-inter">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>
                                {chaptersCount} {chaptersCount === 1 ? 'Chapter' : 'Chapters'}
                            </span>
                        </div>
                        <span className="font-semibold text-sm font-inter text-gray-900">
                            {price ? formatPrice(price) : 'Free'}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};
