'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CalendarClock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddSessionFormProps {
  batchId: string;
  moduleId: string;
  onCreated: (item: {
    id: string;
    title: string;
    type: string;
    position: number;
    pdfUrl: null;
    resourceUrl: null;
    task: null;
    session: null;
  }) => void;
}

export function AddSessionForm({ batchId, moduleId, onCreated }: AddSessionFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [location, setLocation] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setOpen(false);
    setTitle('');
    setScheduledAt('');
    setDurationMinutes('60');
    setLocation('');
    setMeetLink('');
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!scheduledAt) {
      toast.error('Scheduled date/time is required');
      return;
    }
    try {
      setLoading(true);
      const { data: item } = await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items`,
        { type: 'OFFLINE_SESSION', title: title.trim() }
      );
      await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${item.id}/session`,
        {
          title: title.trim(),
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes: parseInt(durationMinutes, 10),
          location: location.trim() || undefined,
          meetLink: meetLink.trim() || undefined
        }
      );
      onCreated(item);
      reset();
      toast.success('Session added');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        toast.error(err.response.data?.error ?? 'Something went wrong');
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs border rounded px-2 py-1 hover:bg-muted/60 transition-colors text-muted-foreground"
      >
        <CalendarClock className="h-3.5 w-3.5 text-violet-500" />+ Offline Session
      </button>
    );
  }

  return (
    <div className="border rounded-lg p-4 mt-3 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-violet-500" />
          Add Offline Session
        </span>
        <button onClick={reset}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Session Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Algebra"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Date &amp; Time</Label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Duration (minutes)</Label>
          <Input
            type="number"
            min="15"
            max="480"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Location (optional)</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Room 301 / Online"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Meet Link (optional)</Label>
          <Input
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/…"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button size="sm" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Session'}
      </Button>
    </div>
  );
}
