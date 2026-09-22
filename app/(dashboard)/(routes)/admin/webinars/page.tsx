'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Video,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Webinar {
  id: string;
  title: string;
  slug: string;
  scheduledAt: string;
  durationMinutes: number;
  isPublished: boolean;
  meetLink: string | null;
  createdAt: string;
  _count: { registrations: number };
}

export default function AdminWebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWebinars = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Webinar[]>('/api/admin/webinars');
      setWebinars(data);
    } catch {
      toast.error('Failed to load webinars');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebinars();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await axios.post<Webinar>('/api/admin/webinars', { title: newTitle.trim() });
      setWebinars((prev) => [data, ...prev]);
      setNewTitle('');
      setShowCreateForm(false);
      toast.success('Webinar created');
    } catch {
      toast.error('Failed to create webinar');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (webinar: Webinar) => {
    setTogglingId(webinar.id);
    try {
      const { data } = await axios.patch<Webinar>(`/api/admin/webinars/${webinar.id}`, {
        isPublished: !webinar.isPublished
      });
      setWebinars((prev) => prev.map((w) => (w.id === data.id ? data : w)));
      toast.success(data.isPublished ? 'Webinar published' : 'Webinar unpublished');
    } catch {
      toast.error('Failed to update webinar');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (webinar: Webinar) => {
    const confirmed = window.confirm(
      `Delete "${webinar.title}"?\n\nThis will also delete all ${webinar._count.registrations} registrations. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(webinar.id);
    try {
      await axios.delete(`/api/admin/webinars/${webinar.id}`);
      setWebinars((prev) => prev.filter((w) => w.id !== webinar.id));
      toast.success('Webinar deleted');
    } catch {
      toast.error('Failed to delete webinar');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-red-500" />
            Webinar Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and manage live webinars. Toggle publish to make them visible publicly.
          </p>
        </div>
        <Button id="create-webinar-btn" onClick={() => setShowCreateForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" />
          New Webinar
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-card border border-border rounded-xl p-4 flex gap-3 items-end animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex-1 space-y-1.5">
            <label htmlFor="new-webinar-title" className="text-sm font-medium">
              Webinar Title
            </label>
            <Input
              id="new-webinar-title"
              placeholder="e.g. Introduction to Ethical Hacking"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              maxLength={300}
              autoFocus
            />
          </div>
          <Button type="submit" disabled={creating || !newTitle.trim()}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
            Cancel
          </Button>
        </form>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : webinars.length === 0 ? (
          <div className="text-center p-16 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No webinars yet. Create your first one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium text-center">Registrations</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {webinars.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-medium max-w-xs truncate">{w.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">/{w.slug}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(w.scheduledAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Link
                        href={`/admin/webinars/${w.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-red-500 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {w._count.registrations}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        id={`toggle-publish-${w.id}`}
                        onClick={() => handleTogglePublish(w)}
                        disabled={togglingId === w.id}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          w.isPublished
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                            : 'bg-muted text-muted-foreground border-border hover:border-foreground'
                        }`}
                      >
                        {togglingId === w.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : w.isPublished ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {w.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/webinars/${w.slug}`}
                          target="_blank"
                          title="View public page"
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/admin/webinars/${w.id}`}
                          title="Edit webinar"
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          id={`delete-webinar-${w.id}`}
                          onClick={() => handleDelete(w)}
                          disabled={deletingId === w.id}
                          title="Delete webinar"
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        >
                          {deletingId === w.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              {webinars.length} webinar{webinars.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
