'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SessionDetail } from './session-detail';
import { CalendarClock } from 'lucide-react';

interface SessionDrawerProps {
  batchId: string;
  session: {
    moduleId: string;
    itemId: string;
    title: string;
  } | null;
  onClose: () => void;
}

export function SessionDrawer({ batchId, session, onClose }: SessionDrawerProps) {
  return (
    <Sheet open={!!session} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader className="mb-6 border-b pb-4">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-violet-500" />
            Manage Offline Session
          </SheetTitle>
          {session && (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
              {session.title}
            </p>
          )}
        </SheetHeader>
        {session && (
          <div className="pb-8">
            <SessionDetail batchId={batchId} moduleId={session.moduleId} itemId={session.itemId} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
