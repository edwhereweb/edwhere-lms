'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError, api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface QuizPlayerProps {
  courseId: string;
  chapterId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quizConfig: any;
}

export const QuizPlayer = ({ courseId, chapterId, quizConfig }: QuizPlayerProps) => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, number[]>>({});
  const [tabSwitches, setTabSwitches] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Prevent right-click and copy
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+C, etc.
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'c')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Blur (Tab switch) Tracker
  useEffect(() => {
    if (!session || session.isCompleted) return;

    const handleBlur = () => {
      setTabSwitches((prev) => {
        const newCount = prev + 1;
        if (quizConfig.maxTabSwitches && newCount > quizConfig.maxTabSwitches) {
          toast.error('Maximum tab switches exceeded! Submitting automatically.');
          forceSubmit(newCount);
        } else if (newCount > 1) {
          toast.error(`Warning: Do not change tabs! (${newCount} strikes)`, { duration: 4000 });
        }
        return newCount;
      });
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, quizConfig]);

  // Load Session
  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get(`/courses/${courseId}/chapters/${chapterId}/quiz/start`);
        if (res.data.activeAttempt === null) {
          if (res.data.previousAttempts) {
            setPreviousAttempts(res.data.previousAttempts);
          }
          setLoading(false);
          return;
        }

        const attempt = res.data;
        setHasStarted(true);
        setSession(attempt);
        setTabSwitches(Math.max(attempt.tabSwitches || 0, 0));

        // Format existing responses
        const initMap: Record<string, number[]> = {};
        if (attempt.responses) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          attempt.responses.forEach((r: any) => {
            initMap[r.questionId] = r.selectedOptions;
          });
        }
        setResponses(initMap);

        // Fetch Questions configuration from the start payload instead of quizConfig
        setQuestions(attempt.questions || []);

        // Timer
        if (quizConfig.timeLimit && !attempt.isCompleted) {
          const startStr = attempt.startTime;
          const startMs = new Date(startStr).getTime();
          const elapsed = Date.now() - startMs;
          const remaining = quizConfig.timeLimit * 60000 - elapsed;
          if (remaining <= 0) {
            forceSubmit(tabSwitches);
          } else {
            setTimeLeft(Math.floor(remaining / 1000));
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: unknown) {
        if (error instanceof ApiError && error.httpStatus === 403) {
          // Probably max attempts
          toast.error(error.message || 'Access forbidden');
        } else {
          toast.error('Failed to start quiz');
        }
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, chapterId]);

  const startTest = async () => {
    setStarting(true);
    try {
      const res = await api.post(`/courses/${courseId}/chapters/${chapterId}/quiz/start`);
      const attempt = res.data;
      setSession(attempt);
      setHasStarted(true);
      setTabSwitches(Math.max(attempt.tabSwitches || 0, 0));
      setQuestions(attempt.questions || []);

      if (quizConfig.timeLimit) {
        setTimeLeft(quizConfig.timeLimit * 60);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: unknown) {
      if (error instanceof ApiError && error.httpStatus === 403) {
        toast.error(error.message || 'Access forbidden');
      } else {
        toast.error('Failed to start quiz');
      }
    } finally {
      setStarting(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || !session || session.isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          toast.error('Time limit reached!');
          forceSubmit(tabSwitches);
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, session]);

  const forceSubmit = async (finalTabSwitches: number) => {
    if (!session || session.isCompleted) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/courses/${courseId}/chapters/${chapterId}/quiz/submit`, {
        attemptId: session.id,
        tabSwitches: finalTabSwitches
      });
      setSession(res.data);
      const passed = res.data.passed;
      if (quizConfig.passScore != null) {
        if (passed) {
          toast.success('Evaluation passed! Chapter completed.');
        } else {
          toast.error(`You didn't reach the pass score (${quizConfig.passScore}%). Try again!`);
        }
      } else {
        toast.success('Evaluation finalized!');
      }
      router.refresh();
    } catch {
      toast.error('Failed to submit evaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionToggle = (
    questionId: string,
    optionIndex: number,
    isMultipleChoice: boolean
  ) => {
    if (session?.isCompleted) return;

    setResponses((prev) => {
      const currentSelection = prev[questionId] || [];
      let newSelection: number[];

      if (!isMultipleChoice) {
        newSelection = [optionIndex];
      } else {
        if (currentSelection.includes(optionIndex)) {
          newSelection = currentSelection.filter((i) => i !== optionIndex);
        } else {
          newSelection = [...currentSelection, optionIndex];
        }
      }

      // Trigger Auto-save
      debouncedSave(questionId, newSelection);

      return { ...prev, [questionId]: newSelection };
    });
  };

  // Debounce Auto-save
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const debouncedSave = useCallback(
    (questionId: string, selections: number[]) => {
      if (debounceTimers.current[questionId]) {
        clearTimeout(debounceTimers.current[questionId]);
      }
      setSyncing(true);
      debounceTimers.current[questionId] = setTimeout(async () => {
        try {
          await api.post(`/courses/${courseId}/chapters/${chapterId}/quiz/save`, {
            attemptId: session.id,
            questionId,
            selectedOptions: selections
          });
        } catch {
          toast.error('Background save failed...');
        } finally {
          setSyncing(false);
        }
      }, 1000);
    },
    [courseId, chapterId, session]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!hasStarted) {
    if (previousAttempts.length > 0) {
      const latestAttempt = previousAttempts[0];
      const attemptsLeft = quizConfig.maxAttempts
        ? Math.max(0, quizConfig.maxAttempts - previousAttempts.length)
        : null;
      const passed =
        quizConfig.passScore == null || (latestAttempt.score ?? 0) >= quizConfig.passScore;

      return (
        <div
          className={cn(
            'border p-8 rounded-md text-center max-w-2xl mx-auto mt-8 shadow-sm',
            passed
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800'
          )}
        >
          {passed ? (
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          )}
          <h2
            className={cn(
              'text-2xl font-bold mb-4',
              passed ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'
            )}
          >
            {passed ? 'Evaluation Passed!' : 'Evaluation Failed'}
          </h2>
          <div className="text-left space-y-4 text-slate-600 dark:text-slate-300 mb-8 border-y py-6">
            {quizConfig.isGraded ? (
              <>
                <p className="flex justify-between">
                  <span>Latest Score:</span>
                  <strong className={cn('text-lg', passed ? 'text-emerald-600' : 'text-rose-600')}>
                    {latestAttempt.score}%
                  </strong>
                </p>
                {quizConfig.passScore != null && (
                  <p className="flex justify-between">
                    <span>Pass Score:</span>
                    <strong>{quizConfig.passScore}%</strong>
                  </p>
                )}
              </>
            ) : (
              <p>Practice test was completed.</p>
            )}
            <p className="flex justify-between border-t pt-4">
              <span>Attempts Used:</span>{' '}
              <strong>
                {previousAttempts.length}{' '}
                {quizConfig.maxAttempts ? `/ ${quizConfig.maxAttempts}` : ''}
              </strong>
            </p>
            {!passed && quizConfig.passScore != null && (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                You need at least {quizConfig.passScore}% to pass this evaluation.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <Button variant="outline" onClick={() => router.push(`/courses/${courseId}/start`)}>
              Return to Course
            </Button>

            {(!quizConfig.maxAttempts || attemptsLeft! > 0) && (
              <Button
                onClick={startTest}
                disabled={starting}
                className={cn(
                  passed ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700',
                  'text-white'
                )}
              >
                {starting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {passed ? 'Take Test Again' : 'Retry Evaluation'}
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-md text-center max-w-2xl mx-auto mt-8 shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Evaluation Instructions</h2>
        <div className="text-left space-y-4 text-slate-600 dark:text-slate-300 mb-8 border-y py-6">
          <p>
            • <strong className="text-slate-900 dark:text-slate-100">Grading:</strong>{' '}
            {quizConfig.isGraded
              ? 'This is a graded test. Your score will be recorded.'
              : 'This is a practice quiz.'}
          </p>
          <p>
            • <strong className="text-slate-900 dark:text-slate-100">Time Limit:</strong>{' '}
            {quizConfig.timeLimit ? `${quizConfig.timeLimit} minutes` : 'No time limit'}. The timer
            will begin immediately when you click start.
          </p>
          {quizConfig.maxAttempts ? (
            <p>
              • <strong className="text-slate-900 dark:text-slate-100">Attempts:</strong> You have a
              maximum of {quizConfig.maxAttempts} attempts.
            </p>
          ) : null}
          {quizConfig.maxTabSwitches ? (
            <p>
              • <strong className="text-slate-900 dark:text-slate-100">Anti-Cheat:</strong> Tab
              switching is strictly monitored. Moving away from the test window{' '}
              {quizConfig.maxTabSwitches} times will automatically submit your test.
            </p>
          ) : null}
        </div>
        <Button
          onClick={startTest}
          disabled={starting}
          size="lg"
          className="w-full sm:w-auto h-12 px-8 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {starting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
          Start Test Now
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-md flex items-center justify-center">
        <AlertTriangle className="mr-2 h-6 w-6" />
        <p>
          You cannot access this evaluation (Maximum attempts reached or configuration missing).
        </p>
      </div>
    );
  }

  if (session.isCompleted) {
    const passed = quizConfig.passScore == null || (session.score ?? 0) >= quizConfig.passScore;
    return (
      <div
        className={cn(
          'border p-8 rounded-md text-center',
          passed
            ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800'
        )}
      >
        {passed ? (
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
        ) : (
          <XCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        )}
        <h2
          className={cn(
            'text-2xl font-bold mb-2',
            passed ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'
          )}
        >
          {passed ? 'Evaluation Passed!' : 'Evaluation Failed'}
        </h2>
        {quizConfig.isGraded ? (
          <div className="mt-3 space-y-1">
            <p className="text-lg">
              Your score:{' '}
              <span
                className={cn(
                  'font-bold',
                  passed
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                )}
              >
                {session.score}%
              </span>
            </p>
            {quizConfig.passScore != null && (
              <p className="text-sm text-slate-500">
                {passed
                  ? `You met the pass score of ${quizConfig.passScore}%.`
                  : `Pass score is ${quizConfig.passScore}%. Please try again.`}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground mt-2">
            Practice test finished and submitted successfully.
          </p>
        )}
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => router.push(`/courses/${courseId}/start`)}>
            Return to Course
          </Button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="pb-20 select-none">
      {/* Header Dashboard Status */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-md shadow-sm mb-8 flex justify-between items-center">
        <div className="flex items-center gap-x-4">
          {timeLeft !== null && (
            <div
              className={cn(
                'flex items-center gap-x-2 font-mono font-bold px-3 py-1.5 rounded-md',
                timeLeft < 60
                  ? 'bg-rose-100 text-rose-700 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800'
              )}
            >
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          {syncing ? (
            <span className="text-xs text-sky-600 flex items-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...
            </span>
          ) : (
            <span className="text-xs text-slate-500">All progress saved</span>
          )}
        </div>

        <Button
          onClick={() => forceSubmit(tabSwitches)}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Evaluation
        </Button>
      </div>

      <div className="space-y-8">
        {questions.length > 0 && (
          <div
            key={questions[currentQuestionIndex].id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-md"
          >
            <div className="font-medium text-lg mb-4 flex">
              <span className="text-indigo-500 mr-2">
                Question {currentQuestionIndex + 1} of {questions.length}:
              </span>
            </div>
            <div className="font-medium text-lg mb-6">{questions[currentQuestionIndex].body}</div>

            {questions[currentQuestionIndex].imageUrl && (
              <div className="relative aspect-video w-full max-w-md mb-6 rounded-md overflow-hidden bg-slate-50 border">
                <Image
                  fill
                  src={questions[currentQuestionIndex].imageUrl}
                  alt="Question diagram"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-contain"
                />
              </div>
            )}

            <div className="space-y-3 pl-6">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {questions[currentQuestionIndex].options.map((opt: any) => {
                const isChecked = (responses[questions[currentQuestionIndex].id] || []).includes(
                  opt.originalIndex
                );
                return (
                  <div
                    key={opt.originalIndex}
                    onClick={() =>
                      handleOptionToggle(
                        questions[currentQuestionIndex].id,
                        opt.originalIndex,
                        questions[currentQuestionIndex].isMultipleChoice
                      )
                    }
                    className={cn(
                      'flex items-center p-3 border rounded-md cursor-pointer transition',
                      isChecked
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <div className="mr-4 flex-shrink-0">
                      {questions[currentQuestionIndex].isMultipleChoice ? (
                        <Checkbox checked={isChecked} />
                      ) : (
                        <div
                          className={cn(
                            'h-5 w-5 rounded-full border flex items-center justify-center',
                            isChecked
                              ? 'border-indigo-500'
                              : 'border-slate-300 dark:border-slate-700'
                          )}
                        >
                          {isChecked && <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />}
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-base',
                        isChecked && 'font-medium text-indigo-900 dark:text-indigo-200'
                      )}
                    >
                      {opt.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0 || isSubmitting}
          variant="outline"
        >
          Previous
        </Button>

        {currentQuestionIndex === questions.length - 1 ? (
          <Button
            onClick={() => forceSubmit(tabSwitches)}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Evaluation
          </Button>
        ) : (
          <Button
            onClick={() =>
              setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
            }
            disabled={isSubmitting}
            className="bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900"
          >
            Next Question
          </Button>
        )}
      </div>
    </div>
  );
};
