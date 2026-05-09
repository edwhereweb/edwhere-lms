'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Zap, Flame } from 'lucide-react';

interface GamificationStats {
  totalXp: number;
  currentLevel: number;
  levelName: string;
  currentStreak: number;
  xpProgress: { current: number; needed: number; level: number };
}

export function GamificationPill() {
  const [stats, setStats] = useState<GamificationStats | null>(null);

  useEffect(() => {
    axios
      .get('/api/gamification/me')
      .then((res) => setStats(res.data))
      .catch(() => {
        // Non-critical — fail silently
      });
  }, []);

  if (!stats) return null;

  const progressPct = Math.min(
    100,
    Math.round((stats.xpProgress.current / stats.xpProgress.needed) * 100)
  );

  const levelTooltip = `${stats.levelName} — ${stats.xpProgress.current} / ${stats.xpProgress.needed} XP to next level`;
  const streakTooltip =
    stats.currentStreak >= 7
      ? `${stats.currentStreak}-day streak 🔥 Multiplier active!`
      : `${stats.currentStreak}-day streak 🔥`;

  return (
    <div className="flex items-center gap-2">
      {/* XP + Level pill */}
      <div
        title={levelTooltip}
        className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 rounded-full px-3 py-1 cursor-default select-none"
      >
        <Zap className="w-3.5 h-3.5 text-violet-500" fill="currentColor" />
        <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
          Lv.{stats.currentLevel}
        </span>
        {/* Mini XP bar */}
        <div className="w-14 h-1.5 bg-violet-200 dark:bg-violet-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-[10px] text-violet-500 dark:text-violet-400 font-medium">
          {stats.totalXp} XP
        </span>
      </div>

      {/* Streak pill — only show if active */}
      {stats.currentStreak > 0 && (
        <div
          title={streakTooltip}
          className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 rounded-full px-2.5 py-1 cursor-default select-none"
        >
          <Flame
            className={`w-3.5 h-3.5 ${stats.currentStreak >= 7 ? 'text-red-500' : 'text-orange-400'}`}
            fill="currentColor"
          />
          <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
            {stats.currentStreak}
          </span>
        </div>
      )}
    </div>
  );
}
