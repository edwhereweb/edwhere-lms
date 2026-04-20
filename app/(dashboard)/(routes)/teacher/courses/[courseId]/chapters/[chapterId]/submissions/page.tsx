'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertTriangle, Users, Target, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

import { HistogramChart } from '@/components/charts/histogram-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SubmissionData {
  averageScore: number;
  medianScore: number;
  totalAttempts: number;
  gradeDistribution: { range: string; count: number }[];
  questionAnalysis: {
    id: string;
    body: string;
    successRate: number;
    totalAttempts: number;
    needsReview: boolean;
    distractors: { optionIndex: number; text: string; count: number }[];
  }[];
}

export default function SubmissionsDashboard({
  params
}: {
  params: { courseId: string; chapterId: string };
}) {
  const router = useRouter();
  const [data, setData] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(
          `/courses/${params.courseId}/chapters/${params.chapterId}/analytics`
        );
        setData(res.data);
      } catch {
        toast.error('Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.courseId, params.chapterId]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!data || data.totalAttempts === 0) {
    return (
      <div className="p-6">
        <Button
          onClick={() =>
            router.push(`/teacher/courses/${params.courseId}/chapters/${params.chapterId}`)
          }
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Chapter setup
        </Button>
        <div className="flex flex-col items-center justify-center bg-slate-50 border rounded-md p-20 text-center">
          <Users className="h-12 w-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Submissions Yet</h2>
          <p className="text-muted-foreground flex items-center">
            Analytics will generate here once students begin taking the evaluation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-x-4 mb-8">
        <Button
          onClick={() =>
            router.push(`/teacher/courses/${params.courseId}/chapters/${params.chapterId}`)
          }
          variant="ghost"
          className="p-2 h-auto"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Quiz Performance Analytics</h1>
          <p className="text-slate-500">Aggregate statistics evaluating cohort comprehension.</p>
        </div>
      </div>

      {/* Top Aggregate Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts Tracker</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Valid student submissions applied to data map
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Average Score</CardTitle>
            <Target className="h-4 w-4 flex-shrink-0 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              Aggregate mean performance for the class cohort
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Median Score Baseline</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.medianScore}%</div>
            <p className="text-xs text-muted-foreground">
              Middle performance metric (filtering outliers)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Chart Segment */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution Histogram</CardTitle>
          <CardDescription>
            Number of attempts falling within specific percentile score brackets.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <HistogramChart data={data.gradeDistribution} />
        </CardContent>
      </Card>

      {/* Detailed Question Level Data Structure */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-6">Question-Level Analysis & Distractors</h2>
        <div className="space-y-4">
          {data.questionAnalysis.map((question, i) => (
            <Card
              key={question.id}
              className={question.needsReview ? 'border-rose-300 bg-rose-50/20' : ''}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-4">
                    <CardTitle className="text-base font-semibold">Question {i + 1}</CardTitle>
                    <div className="text-sm mt-1">{question.body}</div>
                  </div>

                  <div
                    className={`flex flex-col items-center justify-center p-3 rounded-md w-24 flex-shrink-0 ${question.successRate >= 70 ? 'bg-emerald-100 text-emerald-800' : question.needsReview ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'}`}
                  >
                    <span className="text-lg font-bold">{question.successRate}%</span>
                    <span className="text-[10px] uppercase font-bold text-center">Success</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {question.needsReview && (
                  <div className="flex items-center text-sm font-medium text-rose-600 bg-rose-50 p-3 rounded-md mb-4 border border-rose-100">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Difficulty Flag: Over half the cohort failed this question. Review curriculum or
                    wording.
                  </div>
                )}

                {question.distractors.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Most Common Distractors
                    </p>
                    <div className="space-y-2">
                      {question.distractors.map((d, dIdx) => (
                        <div
                          key={dIdx}
                          className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-md text-sm"
                        >
                          <span className="text-slate-700 dark:text-slate-300 truncate pr-4 flex-1">
                            &quot;{d.text}&quot;
                          </span>
                          <span className="font-mono text-slate-500 whitespace-nowrap bg-white border px-2 py-0.5 rounded shadow-sm text-xs">
                            Chosen {d.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-xs text-slate-500">
                    Perfect success. No distractors recorded.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
