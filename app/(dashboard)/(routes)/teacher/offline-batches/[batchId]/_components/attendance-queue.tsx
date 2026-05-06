'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Check, X, Clock, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Profile = {
  userId: string;
  name: string;
  email: string;
  imageUrl: string | null;
};

type AttendanceRecord = {
  id?: string;
  userId: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  remarks?: string | null;
};

interface AttendanceQueueProps {
  batchId: string;
  moduleId: string;
  itemId: string;
  scheduledAt: string;
  initialSubmittedAt: string | null;
}

export const AttendanceQueue = ({
  batchId,
  moduleId,
  itemId,
  scheduledAt,
  initialSubmittedAt
}: AttendanceQueueProps) => {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submittedAt, setSubmittedAt] = useState<string | null>(initialSubmittedAt);
  const [savedAttendances, setSavedAttendances] = useState<AttendanceRecord[]>([]);

  // Queue state
  const [queue, setQueue] = useState<Profile[]>([]);
  const [marked, setMarked] = useState<Record<string, AttendanceRecord>>({});

  // Time state
  const [now, setNow] = useState<Date>(new Date());
  const schedTime = useMemo(() => new Date(scheduledAt).getTime(), [scheduledAt]);

  const diffMinutes = (now.getTime() - schedTime) / 60000;
  const isEarly = diffMinutes < 0;
  const _isWindow1 = diffMinutes >= 0 && diffMinutes <= 13;
  const isWindow2 = diffMinutes > 13 && diffMinutes <= 18;
  const isLocked = diffMinutes > 18;
  const isPastAutoSubmit = diffMinutes >= 15;

  const timeUntilLate = 13 - diffMinutes;
  const timeUntilSubmit = 15 - diffMinutes;

  const formatTimeLeft = (minutesLeft: number) => {
    const totalSeconds = Math.max(0, Math.floor(minutesLeft * 60));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  let countdownText = '';
  if (diffMinutes >= 0 && diffMinutes < 13) {
    countdownText = `${formatTimeLeft(timeUntilLate)} until Late window`;
  } else if (diffMinutes >= 13 && diffMinutes < 15) {
    countdownText = `${formatTimeLeft(timeUntilSubmit)} until Auto-submit`;
  } else if (diffMinutes >= 15) {
    countdownText = 'Auto-submitting...';
  }

  // LATE prompt state
  const [latePromptUserId, setLatePromptUserId] = useState<string | null>(null);
  const [lateReason, setLateReason] = useState('');

  // Editing LATE in List view
  const [editingLateId, setEditingLateId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-submit logic
  useEffect(() => {
    if (!loading && !submittedAt && isPastAutoSubmit && !submitting) {
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, loading, submittedAt, isPastAutoSubmit, submitting]);

  // Sync to local storage
  useEffect(() => {
    if (!loading && !submittedAt) {
      localStorage.setItem(
        `attendance_${batchId}_${itemId}`,
        JSON.stringify({ cachedQueue: queue, cachedMarked: marked })
      );
    }
  }, [queue, marked, loading, submittedAt, batchId, itemId]);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/attendance`
      );
      setProfiles(data.profiles);
      setSubmittedAt(data.submittedAt);
      if (data.attendances?.length > 0) {
        setSavedAttendances(data.attendances);
      } else {
        const cached = localStorage.getItem(`attendance_${batchId}_${itemId}`);
        if (cached) {
          try {
            const { cachedQueue, cachedMarked } = JSON.parse(cached);
            if (cachedQueue && cachedMarked) {
              setQueue(cachedQueue);
              setMarked(cachedMarked);
              return;
            }
          } catch {}
        }
        setQueue(data.profiles);
      }
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleTick = (profile: Profile) => {
    if (isWindow2) {
      // Force reason for being late
      setLatePromptUserId(profile.userId);
      setLateReason('');
      return;
    }

    // Window 1: mark Present
    setMarked((p) => ({
      ...p,
      [profile.userId]: { userId: profile.userId, status: 'PRESENT' }
    }));
    setQueue((q) => q.filter((x) => x.userId !== profile.userId));
  };

  const handleLateSubmit = () => {
    if (!latePromptUserId || !lateReason.trim()) return;
    setMarked((p) => ({
      ...p,
      [latePromptUserId]: { userId: latePromptUserId, status: 'LATE', remarks: lateReason }
    }));
    setQueue((q) => q.filter((x) => x.userId !== latePromptUserId));
    setLatePromptUserId(null);
  };

  const handleCross = (profile: Profile) => {
    // Move to back of queue
    setQueue((q) => {
      const rest = q.filter((x) => x.userId !== profile.userId);
      return [...rest, profile];
    });
  };

  const handleSubmit = async (isAuto = false) => {
    try {
      setSubmitting(true);
      const markedList = Object.values(marked);
      const { data } = await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/attendance`,
        { markedStudents: markedList, isAutoSubmit: isAuto }
      );
      setSubmittedAt(data.submittedAt);
      localStorage.removeItem(`attendance_${batchId}_${itemId}`);
      if (isAuto) toast('Attendance automatically submitted at 15-minute mark.', { icon: 'ℹ️' });
      else toast.success('Attendance submitted');
      await fetchData();
    } catch (error) {
      if (!isAuto) {
        if (axios.isAxiosError(error) && error.response?.data) {
          toast.error(error.response.data);
        } else {
          toast.error('Failed to submit attendance');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateToLate = async (userId: string) => {
    if (!lateReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      const { data } = await axios.patch(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/attendance`,
        { userId, remarks: lateReason }
      );
      setSavedAttendances((p) => p.map((a) => (a.userId === userId ? data : a)));
      toast.success('Updated to Late');
      setEditingLateId(null);
      setLateReason('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        toast.error(error.response.data);
      } else {
        toast.error('Failed to update');
      }
    }
  };

  const currentStudent = queue[0];

  useEffect(() => {
    if (loading || submittedAt || !currentStudent || latePromptUserId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTick(currentStudent);
      } else if (e.code === 'Backspace' || e.key === 'x' || e.key === 'X' || e.key === 'Escape') {
        e.preventDefault();
        handleCross(currentStudent);
      } else if (e.code === 'Enter') {
        e.preventDefault();
        handleSubmit(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submittedAt, currentStudent, latePromptUserId, isWindow2, queue, marked]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // 1. Submitted List View
  if (submittedAt) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Attendance List</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Submitted at {new Date(submittedAt).toLocaleTimeString()}
          </span>
        </div>

        <div className="border rounded-md divide-y">
          {profiles.map((profile) => {
            const att = savedAttendances.find((a) => a.userId === profile.userId) || {
              status: 'ABSENT'
            };
            const isEditing = editingLateId === profile.userId;

            return (
              <div key={profile.userId} className="p-3 flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                    {profile.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={profile.imageUrl}
                        alt={profile.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      profile.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {att.status === 'PRESENT' && (
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                      Present
                    </span>
                  )}
                  {att.status === 'LATE' && (
                    <div className="text-right">
                      <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded">
                        Late
                      </span>
                      {att.remarks && (
                        <p
                          className="text-[10px] text-muted-foreground mt-1 max-w-[150px] truncate"
                          title={att.remarks}
                        >
                          Reason: {att.remarks}
                        </p>
                      )}
                    </div>
                  )}
                  {att.status === 'ABSENT' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                        Absent
                      </span>
                      {isWindow2 && !isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingLateId(profile.userId);
                            setLateReason('');
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {isEditing && (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Reason for being late..."
                        value={lateReason}
                        onChange={(e) => setLateReason(e.target.value)}
                        className="h-7 text-xs w-48"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleUpdateToLate(profile.userId)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEditingLateId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Queue View (Unsubmitted)
  if (isEarly) {
    return (
      <div className="text-center p-6 border rounded-md bg-muted/50">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">Session has not started yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Attendance will be available at {new Date(scheduledAt).toLocaleTimeString()}
        </p>
      </div>
    );
  }

  if (isLocked && !submittedAt) {
    // Should theoretically not happen if auto-submit fired at 15m,
    // but if it didn't, we show a state where they missed the window completely.
    return (
      <div className="text-center p-6 border rounded-md bg-destructive/10 border-destructive/20">
        <p className="text-sm font-medium text-destructive">Attendance Window Closed</p>
        <p className="text-xs text-muted-foreground mt-1">
          The queue was not submitted in time. Refresh to view the auto-evaluated list.
        </p>
      </div>
    );
  }

  // keyboard useEffect moved up

  const handleMarkRemaining = () => {
    if (isWindow2) {
      toast.error('Cannot bulk mark present during Late window.');
      return;
    }
    setMarked((p) => {
      const newMarked = { ...p };
      queue.forEach((profile) => {
        newMarked[profile.userId] = { userId: profile.userId, status: 'PRESENT' };
      });
      return newMarked;
    });
    setQueue([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">Attendance Queue</h3>
          {!submittedAt && diffMinutes >= 0 && (
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded font-mono font-medium',
                isWindow2 ? 'text-amber-600 bg-amber-100' : 'text-blue-600 bg-blue-100'
              )}
            >
              {countdownText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {Object.keys(marked).length} Marked | {queue.length} Remaining
          </span>
        </div>
      </div>

      {currentStudent ? (
        <div className="border rounded-md p-6 bg-card flex flex-col items-center text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-lg font-medium overflow-hidden shrink-0">
            {currentStudent.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentStudent.imageUrl}
                alt={currentStudent.name}
                className="h-full w-full object-cover"
              />
            ) : (
              currentStudent.name.charAt(0)
            )}
          </div>

          <div>
            <h4 className="font-semibold text-lg">{currentStudent.name}</h4>
            <p className="text-sm text-muted-foreground">{currentStudent.email}</p>
          </div>

          {latePromptUserId === currentStudent.userId ? (
            <div className="w-full max-w-sm space-y-3">
              <Input
                placeholder="Reason for being late..."
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={handleLateSubmit} disabled={!lateReason.trim()}>
                  Confirm Late
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setLatePromptUserId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                onClick={() => handleCross(currentStudent)}
              >
                <X className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
                onClick={() => handleTick(currentStudent)}
              >
                <Check className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-6 border rounded-md bg-muted/50">
          <p className="text-sm font-medium">Queue is empty</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            All students have been evaluated. Click submit to finalize.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        {!isWindow2 && queue.length > 0 && (
          <Button variant="outline" onClick={handleMarkRemaining} disabled={submitting}>
            Mark {queue.length} Remaining as Present
          </Button>
        )}
        <div className="flex-1 flex justify-end">
          <Button onClick={() => handleSubmit(false)} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Attendance'}
          </Button>
        </div>
      </div>
    </div>
  );
};
