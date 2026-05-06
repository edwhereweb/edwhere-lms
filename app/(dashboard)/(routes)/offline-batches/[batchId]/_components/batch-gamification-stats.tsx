'use client';

import { Flame, Trophy, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface BatchGamificationStatsProps {
  streak: number;
  rank: number;
  score: number;
  possible: number;
}

export const BatchGamificationStats = ({
  streak,
  rank,
  score,
  possible
}: BatchGamificationStatsProps) => {
  const accuracy = possible > 0 ? Math.round((score / possible) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <Card className="overflow-hidden border-orange-200 bg-orange-50/30 dark:border-orange-900 dark:bg-orange-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/40">
              <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Attendance Streak
              </p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{streak}</p>
                <p className="text-sm font-medium text-orange-600/70">Sessions</p>
              </div>
            </div>
          </div>
          {streak > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-orange-600">
              <TrendingUp className="h-3 w-3" />
              Keep it up! You&apos;re on fire 🔥
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-indigo-200 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
              <Trophy className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Batch Rank
              </p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">#{rank}</p>
                <p className="text-sm font-medium text-indigo-600/70">Overall</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-indigo-600">
            <Target className="h-3 w-3" />
            Based on cumulative MCQ scores
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Quiz Accuracy
              </p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {accuracy}%
                </p>
                <p className="text-sm font-medium text-emerald-600/70">
                  Score: {score}/{possible}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 w-full bg-emerald-200 dark:bg-emerald-900/40 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
