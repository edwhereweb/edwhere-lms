'use client';
import { useState } from 'react';
import { SessionReportDetail } from '@/actions/get-batch-reports';
import { SessionDrilldownSheet } from './session-drilldown-sheet';
import { ChevronRight } from 'lucide-react';

interface SessionListInteractiveProps {
  sessions: SessionReportDetail[];
}

export const SessionListInteractive = ({ sessions }: SessionListInteractiveProps) => {
  const [selectedSession, setSelectedSession] = useState<SessionReportDetail | null>(null);

  return (
    <>
      <div className="divide-y">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => setSelectedSession(session)}
            className="w-full text-left p-4 hover:bg-muted/50 transition flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-sm line-clamp-1">{session.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{new Date(session.scheduledAt).toLocaleDateString()}</span>
                {session.ieScore !== null ? (
                  <span className="text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded font-medium">
                    IE: {session.ieScore.toFixed(1)}
                  </span>
                ) : (
                  <span className="italic">No feedback</span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
          </button>
        ))}
        {sessions.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground italic">
            No offline sessions recorded.
          </div>
        )}
      </div>

      <SessionDrilldownSheet
        session={selectedSession}
        open={!!selectedSession}
        onOpenChange={(open) => !open && setSelectedSession(null)}
      />
    </>
  );
};
