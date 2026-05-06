'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, TrendingUp, Users, Award } from 'lucide-react';

interface QuestionStat {
  id: string;
  position: number;
  body: string;
  options: string[];
  correctOption: number;
  correctCount: number;
  incorrectCount: number;
  correctPct: number;
}

interface McqAnalyticsData {
  mcqTitle: string;
  totalEnrolled: number;
  eligibleCount: number;
  participantCount: number;
  participationRate: number;
  classAverageScore: number;
  attendanceFinalized: boolean;
  questions: QuestionStat[];
}

interface McqAnalyticsProps {
  batchId: string;
  moduleId: string;
  itemId: string;
}

export function McqAnalytics({ batchId, moduleId, itemId }: McqAnalyticsProps) {
  const [data, setData] = useState<McqAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data: res } = await axios.get(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/mcq/analytics`
      );
      setData(res);
    } catch {
      toast.error('Failed to load MCQ analytics');
    } finally {
      setLoading(false);
    }
  }, [batchId, moduleId, itemId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  if (!data.attendanceFinalized) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Analytics will be available once attendance is finalized.
      </p>
    );
  }

  if (data.participantCount === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No submissions yet — analytics will appear once students complete the MCQ.
      </p>
    );
  }

  return (
    <div className="space-y-6 pt-1">
      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Award className="h-4 w-4 text-indigo-500" />}
          label="Class Average"
          value={`${data.classAverageScore}%`}
          sub="score across all submissions"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          label="Participation"
          value={`${data.participationRate}%`}
          sub="of eligible students submitted"
        />
        <StatCard
          icon={<Users className="h-4 w-4 text-sky-500" />}
          label="Respondents"
          value={`${data.participantCount} / ${data.eligibleCount}`}
          sub={`of ${data.totalEnrolled} enrolled`}
        />
      </div>

      {/* ── Per-question breakdown ──────────────────────────────────── */}
      {data.questions.length > 0 && (
        <div className="space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Question Breakdown
          </p>
          {data.questions.map((q, idx) => (
            <QuestionRow key={q.id} question={q} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>
    </div>
  );
}

interface QuestionRowProps {
  question: QuestionStat;
  index: number;
}

function QuestionRow({ question, index }: QuestionRowProps) {
  const total = question.correctCount + question.incorrectCount;
  const correctPct = question.correctPct;
  const incorrectPct = total > 0 ? Math.round((question.incorrectCount / total) * 1000) / 10 : 0;

  return (
    <div className="space-y-2">
      {/* Question text */}
      <div className="flex items-start gap-2">
        <span className="text-[11px] font-mono text-muted-foreground mt-0.5 shrink-0 w-5 text-right">
          {index + 1}.
        </span>
        <p className="text-sm leading-snug">{question.body}</p>
      </div>

      {/* Correct answer label */}
      <div className="pl-7">
        <span className="text-[10px] text-emerald-600 font-medium">
          ✓ {String.fromCharCode(65 + question.correctOption)}.{' '}
          {question.options[question.correctOption]}
        </span>
      </div>

      {/* Bar */}
      <div className="pl-7 space-y-1">
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
          {correctPct > 0 && (
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${correctPct}%` }}
            />
          )}
          {incorrectPct > 0 && (
            <div
              className="h-full bg-rose-400 transition-all duration-500"
              style={{ width: `${incorrectPct}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span className="text-emerald-600 font-medium">
            {correctPct}% correct ({question.correctCount})
          </span>
          <span className="text-rose-500 font-medium">
            {incorrectPct}% wrong ({question.incorrectCount})
          </span>
        </div>
      </div>
    </div>
  );
}
