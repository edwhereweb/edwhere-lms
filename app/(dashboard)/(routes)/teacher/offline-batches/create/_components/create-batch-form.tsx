'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export function CreateBatchForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allowSameDay, setAllowSameDay] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      setIsLoading(true);
      const payload: Record<string, string | boolean> = { title: title.trim() };
      if (description) payload.description = description;
      if (startDate) payload.startDate = new Date(startDate).toISOString();
      if (endDate) payload.endDate = new Date(endDate).toISOString();
      if (allowSameDay) payload.allowSameDayOfflineSession = true;

      const { data } = await axios.post('/api/teacher/offline-batches', payload);
      toast.success('Batch created');
      router.push(`/teacher/offline-batches/${data.id}`);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="batch-title">Title *</Label>
        <Input
          id="batch-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Ethical Hacking — June 2025 Batch"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="batch-description">Description</Label>
        <Textarea
          id="batch-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Batch description (optional)"
          rows={4}
          disabled={isLoading}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="batch-start">Start Date</Label>
          <Input
            id="batch-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-end">End Date</Label>
          <Input
            id="batch-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
        <Checkbox
          id="batch-allow-same-day"
          checked={allowSameDay}
          onCheckedChange={(checked) => setAllowSameDay(!!checked)}
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="batch-allow-same-day">Allow same-day session scheduling</Label>
          <p className="text-sm text-muted-foreground">
            If checked, instructors will be permitted to schedule offline sessions on the exact same
            day. By default, 24h notice is required.
          </p>
        </div>
      </div>

      <Button id="create-batch-submit" type="submit" disabled={isLoading || !title.trim()}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating…
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Create Batch
          </>
        )}
      </Button>
    </form>
  );
}
