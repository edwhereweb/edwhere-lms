'use client';

import { useState } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function IssueCertificateModal({ isOpen, onClose, onSuccess }: IssueModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: '',
    courseName: '',
    duration: '',
    deliveryMode: 'Online',
    dateOfAchievement: '',
    score: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/admin/certificates', formData);
      toast.success('Certificate issued successfully');
      setFormData({
        recipientName: '',
        courseName: '',
        duration: '',
        deliveryMode: 'Online',
        dateOfAchievement: '',
        score: ''
      });
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to issue certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue New Certificate</DialogTitle>
          <DialogDescription>
            Manually enter details to generate a single certificate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name</Label>
            <Input
              id="recipientName"
              name="recipientName"
              required
              value={formData.recipientName}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="courseName">Program / Course Name</Label>
            <Input
              id="courseName"
              name="courseName"
              required
              value={formData.courseName}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                name="duration"
                placeholder="e.g. 6 Months"
                required
                value={formData.duration}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryMode">Delivery Mode</Label>
              <select
                id="deliveryMode"
                name="deliveryMode"
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.deliveryMode}
                onChange={handleChange}
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfAchievement">Date of Achievement</Label>
              <Input
                id="dateOfAchievement"
                name="dateOfAchievement"
                type="date"
                required
                value={formData.dateOfAchievement}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="score">Score (Optional /100)</Label>
              <Input
                id="score"
                name="score"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 85"
                value={formData.score}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Issue Certificate
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
