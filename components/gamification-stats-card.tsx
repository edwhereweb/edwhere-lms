'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Zap, Flame, Trophy, TrendingUp } from 'lucide-react';

interface GamificationStats {
  totalXp: number;
  currentLevel: number;
  levelName: string;
  currentStreak: number;
  longestStreak: number;
  xpProgress: { current: number; needed: number; level: number };
}

export function GamificationStatsCard() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/api/gamification/me')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const progressPct = Math.min(
    100,
    Math.round((stats.xpProgress.current / stats.xpProgress.needed) * 100)
  );

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-violet-500" />
        Your Progress
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Level */}
        <div className="rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 p-3">
          <p className="text-xs text-violet-500 font-semibold uppercase tracking-wider mb-1">
            Level
          </p>
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
            {stats.currentLevel}
          </p>
          <p className="text-xs text-violet-500 mt-0.5">{stats.levelName}</p>
        </div>

        {/* Total XP */}
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-3">
          <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Total XP
          </p>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {stats.totalXp.toLocaleString()}
          </p>
          <p className="text-xs text-indigo-500 mt-0.5">XP earned</p>
        </div>

        {/* Current Streak */}
        <div className="rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 p-3">
          <p className="text-xs text-orange-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Streak
          </p>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {stats.currentStreak}
          </p>
          <p className="text-xs text-orange-500 mt-0.5">
            day{stats.currentStreak !== 1 ? 's' : ''} active
          </p>
        </div>

        {/* Best Streak */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 p-3">
          <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Best Streak
          </p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {stats.longestStreak}
          </p>
          <p className="text-xs text-amber-500 mt-0.5">personal record</p>
        </div>
      </div>

      {/* XP Progress bar to next level */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Progress to Level {stats.currentLevel + 1}</span>
          <span>
            {stats.xpProgress.current} / {stats.xpProgress.needed} XP
          </span>
        </div>
        <div className="h-2 bg-violet-100 dark:bg-violet-900/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {stats.currentStreak >= 7 && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 font-medium flex items-center gap-1">
          <Flame className="w-3 h-3" />
          7-day streak active — you&apos;re on fire! 🔥
        </p>
      )}
    </div>
  );
}
