'use client';

import axios from 'axios';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface GoogleMeetFormProps {
  courseId: string;
  initialEnabled: boolean;
  globallyEnabled: boolean;
}

export const GoogleMeetForm = ({
  courseId,
  initialEnabled,
  globallyEnabled
}: GoogleMeetFormProps) => {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);

  const onToggle = async (checked: boolean) => {
    const previous = enabled;
    setEnabled(checked);
    setIsSaving(true);
    try {
      await axios.patch(`/api/courses/${courseId}`, { googleMeetEnabled: checked });
      toast.success(checked ? 'Google Meet enabled' : 'Google Meet disabled');
      router.refresh();
    } catch {
      setEnabled(previous);
      toast.error('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800">
      <div className="font-medium">Google Meet live sessions</div>
      <div className="flex flex-row items-start space-x-3 mt-4 rounded-md border p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <Checkbox
          id="google-meet-enabled"
          checked={enabled}
          disabled={isSaving}
          onCheckedChange={(value) => void onToggle(value === true)}
          aria-describedby="google-meet-description"
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="google-meet-enabled">Enable live sessions for this course</Label>
          <p id="google-meet-description" className="text-sm text-muted-foreground">
            Lets instructors schedule Google Meet sessions that enrolled learners can join.
          </p>
        </div>
      </div>
      {globallyEnabled !== true && (
        <p
          role="status"
          suppressHydrationWarning
          className="text-sm mt-3 text-amber-700 dark:text-amber-400"
        >
          Google Meet is currently turned off for the whole platform (GOOGLE_MEET_ENABLED). This
          setting is saved, but live sessions stay unavailable until it is enabled.
        </p>
      )}
    </div>
  );
};
