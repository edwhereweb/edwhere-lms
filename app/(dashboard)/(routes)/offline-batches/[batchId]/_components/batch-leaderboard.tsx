'use client';

import { Trophy, Medal, Star, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
interface LeaderboardEntry {
  userId: string;
  name: string;
  imageUrl: string | null | undefined;
  score: number;
  possible: number;
  streak: number;
}

interface BatchLeaderboardProps {
  batchId: string;
  currentUserId: string;
}

export const BatchLeaderboard = ({ batchId, currentUserId }: BatchLeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/batch/${batchId}/leaderboard`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setEntries(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [batchId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading leaderboard...</div>;
  }

  return (
    <Card className="shadow-lg border-none bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/10 dark:to-background">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Batch Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry, index) => {
            const isCurrentUser = entry.userId === currentUserId;
            const rank = index + 1;

            return (
              <div
                key={entry.userId}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl transition-all',
                  isCurrentUser
                    ? 'bg-indigo-600 text-white shadow-md scale-[1.02]'
                    : 'bg-white/50 dark:bg-muted/30 border border-slate-100 dark:border-slate-800'
                )}
              >
                <div className="flex-shrink-0 w-8 text-center font-bold text-lg">
                  {rank === 1 ? (
                    <Trophy className="h-6 w-6 text-yellow-500 mx-auto" />
                  ) : rank === 2 ? (
                    <Medal className="h-6 w-6 text-slate-400 mx-auto" />
                  ) : rank === 3 ? (
                    <Medal className="h-6 w-6 text-amber-600 mx-auto" />
                  ) : (
                    <span className={isCurrentUser ? 'text-white' : 'text-slate-400'}>{rank}</span>
                  )}
                </div>

                <div className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden bg-slate-200 flex-shrink-0">
                  {entry.imageUrl ? (
                    <Image
                      src={entry.imageUrl}
                      alt={entry.name}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700 font-bold">
                      {entry.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-bold truncate',
                      isCurrentUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                    )}
                  >
                    {entry.name}
                    {isCurrentUser && ' (You)'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span
                      className={cn(
                        'text-[10px] flex items-center gap-1 uppercase font-bold tracking-tight',
                        isCurrentUser ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'
                      )}
                    >
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {entry.score} pts
                    </span>
                    {entry.streak > 0 && (
                      <span
                        className={cn(
                          'text-[10px] flex items-center gap-1 uppercase font-bold tracking-tight',
                          isCurrentUser ? 'text-orange-100' : 'text-orange-600'
                        )}
                      >
                        <Flame className="h-2.5 w-2.5 fill-current" />
                        {entry.streak} streak
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <div
                    className={cn(
                      'text-sm font-black',
                      isCurrentUser ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {entry.possible > 0 ? Math.round((entry.score / entry.possible) * 100) : 0}%
                  </div>
                  <div
                    className={cn(
                      'text-[10px] uppercase font-medium',
                      isCurrentUser ? 'text-indigo-200' : 'text-slate-400'
                    )}
                  >
                    Accuracy
                  </div>
                </div>
              </div>
            );
          })}

          {entries.length === 0 && (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <Star className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>No activity recorded yet.</p>
              <p className="text-xs">Submit quizzes and attend sessions to rank up!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
