import Image from 'next/image';
import { Award, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AuthorBioProps {
  author: {
    name: string;
    bio: string | null;
    imageUrl: string | null;
    credentials: string[];
  };
}

export const AuthorBio = ({ author }: AuthorBioProps) => {
  return (
    <div className="mt-16 p-6 md:p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
        <div className="relative h-24 w-24 flex-shrink-0">
          {author.imageUrl ? (
            <Image
              src={author.imageUrl}
              alt={author.name}
              fill
              className="rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-sm"
            />
          ) : (
            <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <span className="text-2xl font-bold">{author.name.charAt(0)}</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-x-2">
              {author.name}
              <ShieldCheck className="h-5 w-5 text-sky-500 fill-sky-50/50" />
            </h3>
          </div>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm md:text-base">
            {author.bio || 'No bio available.'}
          </p>

          {author.credentials.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
              {author.credentials.map((cred, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-sky-100/50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800 py-1 px-3 flex items-center gap-x-1.5"
                >
                  <Award className="h-3 w-3" />
                  {cred}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
