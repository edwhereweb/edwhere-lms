'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

interface BulkDeleteModalProps {
  count: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function BulkDeleteModal({ count, isOpen, onClose, onConfirm }: BulkDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const isConfirmed = confirmText === 'delete';

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    try {
      setLoading(true);
      await onConfirm();
      setConfirmText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Bulk Delete Certificates
          </DialogTitle>
          <DialogDescription>
            You are about to permanently revoke and delete{' '}
            <strong>
              {count} certificate{count !== 1 ? 's' : ''}
            </strong>
            . This action cannot be undone and the credentials will no longer be verifiable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium mb-1">⚠ This is a destructive operation</p>
            <p className="text-xs opacity-80">
              All selected certificates will be permanently removed from the database. Students who
              received these credentials will lose access to their verification links.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <strong className="font-mono text-destructive">delete</strong> to confirm
            </label>
            <Input
              id="bulk-delete-confirm-input"
              placeholder="delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toLowerCase())}
              className={
                confirmText && !isConfirmed
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              id="bulk-delete-confirm-btn"
              variant="destructive"
              disabled={!isConfirmed || loading}
              onClick={handleConfirm}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete {count} Certificate{count !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
