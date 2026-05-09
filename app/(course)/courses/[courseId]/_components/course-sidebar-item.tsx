'use client';

import {
  CheckCircle,
  Lock,
  PlayCircle,
  BookOpen,
  FileText,
  Gamepad2,
  GraduationCap,
  FolderKanban
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';

// Maps each content type to a distinct icon so students can identify lesson types at a glance.
const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  VIDEO_MUX: PlayCircle,
  VIDEO_YOUTUBE: PlayCircle,
  TEXT: BookOpen,
  PDF_DOCUMENT: FileText,
  HTML_EMBED: Gamepad2,
  EVALUATION: GraduationCap,
  HANDS_ON_PROJECT: FolderKanban
};

interface CourseSidebarItemProps {
  label: string;
  id: string;
  isCompleted: boolean;
  courseId: string;
  isLocked: boolean;
  contentType?: string | null;
}

export const CourseSidebarItem = ({
  label,
  id,
  isCompleted,
  courseId,
  isLocked,
  contentType
}: CourseSidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const ContentIcon = CONTENT_TYPE_ICONS[contentType ?? 'VIDEO_MUX'] ?? PlayCircle;

  // State takes precedence over content type for the icon
  const Icon = isLocked ? Lock : isCompleted ? CheckCircle : ContentIcon;

  const isActive = pathname?.includes(id);

  const onClick = () => {
    router.push(`/courses/${courseId}/chapters/${id}`);
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'flex items-center gap-x-2 text-muted-foreground text-sm font-[500] pl-6 transition-all hover:text-foreground hover:bg-accent',
        isActive && 'text-foreground bg-accent',
        isCompleted && 'text-emerald-700 hover:text-emerald-700',
        isCompleted && isActive && 'bg-emerald-200/20'
      )}
    >
      <div className="flex items-center gap-x-2 py-4 min-w-0 flex-1">
        <Icon
          size={22}
          className={cn(
            'shrink-0 text-muted-foreground mt-0.5',
            isActive && 'text-foreground',
            isCompleted && 'text-emerald-700'
          )}
        />
        <span className="text-left break-words">{label}</span>
      </div>
      <div
        className={cn(
          'ml-auto opacity-0 border-2 border-primary h-full transition-all',
          isActive && 'opacity-100',
          isCompleted && 'border-[#171717]'
        )}
      />
    </button>
  );
};
