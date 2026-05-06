'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/star-rating';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface StudentFeedbackFormProps {
  batchId: string;
  itemId: string;
  onSuccess: () => void;
}

export function StudentFeedbackForm({ batchId, itemId, onSuccess }: StudentFeedbackFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState({
    instructorRating: 0,
    materialRating: 0,
    activityRating: 0,
    overallRating: 0,
    paceRating: 3 // Default: Perfect
  });
  const [likedMost, setLikedMost] = useState('');
  const [improvement, setImprovement] = useState('');

  const handleSubmit = async () => {
    if (
      !ratings.instructorRating ||
      !ratings.materialRating ||
      !ratings.activityRating ||
      !ratings.overallRating
    ) {
      toast.error('Please provide all star ratings');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`/api/student/offline-batches/${batchId}/sessions/${itemId}/feedback`, {
        ...ratings,
        likedMost,
        improvement
      });
      toast.success('Feedback submitted successfully');
      onSuccess();
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
    <div className="border border-indigo-200 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20 rounded-lg p-6 space-y-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-800 dark:text-indigo-400">
          <MessageSquare className="h-5 w-5" />
          Share Your Feedback
        </h3>
        <p className="text-sm text-muted-foreground">
          Your feedback is anonymous and helps us improve the learning experience. Please submit
          feedback to see your MCQ score.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Star Ratings */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Instructor Teaching Quality</Label>
            <StarRating
              value={ratings.instructorRating}
              onChange={(v) => setRatings((p) => ({ ...p, instructorRating: v }))}
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quality of Materials (Slides/Labs)</Label>
            <StarRating
              value={ratings.materialRating}
              onChange={(v) => setRatings((p) => ({ ...p, materialRating: v }))}
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Class Activities & Engagement</Label>
            <StarRating
              value={ratings.activityRating}
              onChange={(v) => setRatings((p) => ({ ...p, activityRating: v }))}
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Overall Experience</Label>
            <StarRating
              value={ratings.overallRating}
              onChange={(v) => setRatings((p) => ({ ...p, overallRating: v }))}
            />
          </div>
        </div>

        {/* Pace & Qualitative */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">How was the pace of the session?</Label>
            <div className="flex gap-2">
              {[
                { value: 1, label: 'Too Slow' },
                { value: 3, label: 'Just Right' },
                { value: 5, label: 'Too Fast' }
              ].map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={ratings.paceRating === p.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRatings((prev) => ({ ...prev, paceRating: p.value }))}
                  className={cn(
                    'flex-1 text-xs h-8',
                    ratings.paceRating === p.value && 'bg-indigo-600 hover:bg-indigo-700'
                  )}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="liked" className="text-sm font-medium">
              What did you like most about today?
            </Label>
            <Textarea
              id="liked"
              placeholder="The practical examples, the instructor's energy..."
              value={likedMost}
              onChange={(e) => setLikedMost(e.target.value)}
              className="resize-none h-20 bg-background"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="improvement" className="text-sm font-medium">
              Any suggestions for improvement?
            </Label>
            <Textarea
              id="improvement"
              placeholder="More time for labs, clearer slides..."
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              className="resize-none h-20 bg-background"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit & See Score
        </Button>
      </div>
    </div>
  );
}
