'use client';

import { useState, useEffect } from 'react';
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

interface Certificate {
  id: string;
  credentialId: string;
  recipientName: string;
  courseName: string;
  duration: string;
  deliveryMode: string;
  dateOfAchievement: string;
  createdAt: string;
}

interface EditCertificateModalProps {
  cert: Certificate | null;
  onClose: () => void;
  onSuccess: (updated: Certificate) => void;
}

export function EditCertificateModal({ cert, onClose, onSuccess }: EditCertificateModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: '',
    courseName: '',
    duration: '',
    deliveryMode: 'Online',
    dateOfAchievement: ''
  });

  // Populate form when cert changes
  useEffect(() => {
    if (cert) {
      setFormData({
        recipientName: cert.recipientName,
        courseName: cert.courseName,
        duration: cert.duration,
        deliveryMode: cert.deliveryMode,
        dateOfAchievement: cert.dateOfAchievement
      });
    }
  }, [cert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cert) return;
    try {
      setLoading(true);
      const { data } = await axios.patch(`/api/admin/certificates/${cert.id}`, formData);
      toast.success('Certificate updated');
      onSuccess({ ...cert, ...data });
      onClose();
    } catch {
      toast.error('Failed to update certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Dialog open={!!cert} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Certificate</DialogTitle>
          <DialogDescription>
            Editing credential{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{cert?.credentialId}</code>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-recipientName">Recipient Name</Label>
            <Input
              id="edit-recipientName"
              name="recipientName"
              required
              value={formData.recipientName}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-courseName">Program / Course Name</Label>
            <Input
              id="edit-courseName"
              name="courseName"
              required
              value={formData.courseName}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration</Label>
              <Input
                id="edit-duration"
                name="duration"
                placeholder="e.g. 6 Months"
                required
                value={formData.duration}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deliveryMode">Delivery Mode</Label>
              <select
                id="edit-deliveryMode"
                name="deliveryMode"
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={formData.deliveryMode}
                onChange={handleChange}
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dateOfAchievement">Date of Achievement</Label>
            <Input
              id="edit-dateOfAchievement"
              name="dateOfAchievement"
              type="date"
              required
              value={formData.dateOfAchievement}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
