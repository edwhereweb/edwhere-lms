'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Feedback {
  id: string;
  ieScore: number;
}

interface FeedbackFormProps {
  batchId: string;
  moduleId: string;
  itemId: string;
  onSuccess: (feedback: Feedback) => void;
}

export function FeedbackForm({ batchId, moduleId, itemId, onSuccess }: FeedbackFormProps) {
  const [submitting, setSubmitting] = useState(false);

  // Qualitative
  const [wentWell, setWentWell] = useState<string[]>(['', '', '']);
  const [wentWrong, setWentWrong] = useState<string[]>(['', '', '']);

  // Quantitative
  const [metrics, setMetrics] = useState({
    askingQuestions: 5,
    answeringQuickly: 5,
    groupTalk: 5,
    classPace: 5,
    understandingIdeas: 5,
    doingTheWork: 5,
    fixingMistakes: 5,
    memory: 5,
    goalCompletion: 5
  });

  const updateWentWell = (idx: number, val: string) => {
    const nw = [...wentWell];
    nw[idx] = val;
    setWentWell(nw);
  };

  const updateWentWrong = (idx: number, val: string) => {
    const nw = [...wentWrong];
    nw[idx] = val;
    setWentWrong(nw);
  };

  const handleMetricChange = (key: keyof typeof metrics, val: string) => {
    setMetrics((prev) => ({ ...prev, [key]: Number(val) }));
  };

  const handleSubmit = async () => {
    if (wentWell.some((v) => !v.trim()) || wentWrong.some((v) => !v.trim())) {
      toast.error('Please fill out all 3 points for both What Went Well and What Went Wrong.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/feedback`,
        {
          wentWell: wentWell.map((v) => v.trim()),
          wentWrong: wentWrong.map((v) => v.trim()),
          ...metrics
        }
      );
      toast.success('Feedback submitted successfully');
      onSuccess(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        toast.error(err.response.data?.error || 'Failed to submit feedback');
      } else {
        toast.error('Failed to submit feedback');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20 rounded-lg p-6 space-y-8 relative overflow-hidden mt-6">
      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Mandatory Post-Session Feedback
        </h3>
        <p className="text-sm text-muted-foreground">
          Please complete the session evaluation below. The IE Score will be generated from these
          metrics.
        </p>
      </div>

      {/* Qualitative */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">What went well?</h4>
          {wentWell.map((val, idx) => (
            <Input
              key={`well-${idx}`}
              value={val}
              onChange={(e) => updateWentWell(idx, e.target.value)}
              placeholder={`Point ${idx + 1}...`}
              className="text-sm h-9 bg-background"
            />
          ))}
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-medium">What went wrong?</h4>
          {wentWrong.map((val, idx) => (
            <Input
              key={`wrong-${idx}`}
              value={val}
              onChange={(e) => updateWentWrong(idx, e.target.value)}
              placeholder={`Point ${idx + 1}...`}
              className="text-sm h-9 bg-background"
            />
          ))}
        </div>
      </div>

      {/* Quantitative */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium pb-2 border-b">IE Metrics (0-10)</h4>

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Behavioral Participation
            </p>
            <MetricSlider
              label="Asking Questions"
              description="How often did students ask questions to learn more?"
              value={metrics.askingQuestions}
              onChange={(v) => handleMetricChange('askingQuestions', v)}
            />
            <MetricSlider
              label="Answering Quickly"
              description="Did they answer you right away without being forced?"
              value={metrics.answeringQuickly}
              onChange={(v) => handleMetricChange('answeringQuickly', v)}
            />
            <MetricSlider
              label="Group Talk"
              description="Did students talk and help each other during the class?"
              value={metrics.groupTalk}
              onChange={(v) => handleMetricChange('groupTalk', v)}
            />
            <MetricSlider
              label="Class Pace"
              description="Could the students keep up with your teaching speed?"
              value={metrics.classPace}
              onChange={(v) => handleMetricChange('classPace', v)}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Learning Progress
            </p>
            <MetricSlider
              label="Understanding Ideas"
              description="How well did they understand the main topics today?"
              value={metrics.understandingIdeas}
              onChange={(v) => handleMetricChange('understandingIdeas', v)}
            />
            <MetricSlider
              label="Doing the Work"
              description="Could they do the lab/exercises by themselves?"
              value={metrics.doingTheWork}
              onChange={(v) => handleMetricChange('doingTheWork', v)}
            />
            <MetricSlider
              label="Fixing Mistakes"
              description="If they made a mistake, could they fix it or understand why?"
              value={metrics.fixingMistakes}
              onChange={(v) => handleMetricChange('fixingMistakes', v)}
            />
            <MetricSlider
              label="Memory"
              description="Did they remember what you taught at the start of class?"
              value={metrics.memory}
              onChange={(v) => handleMetricChange('memory', v)}
            />
            <MetricSlider
              label="Goal Completion"
              description="Did the class finish all the planned lessons for today?"
              value={metrics.goalCompletion}
              onChange={(v) => handleMetricChange('goalCompletion', v)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[120px]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Feedback
        </Button>
      </div>
    </div>
  );
}

function MetricSlider({
  label,
  description,
  value,
  onChange
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 bg-background/50 p-3 rounded-md border border-border/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate" title={description}>
          {description}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 accent-amber-600"
        />
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-sm font-bold border">
          {value}
        </div>
      </div>
    </div>
  );
}
