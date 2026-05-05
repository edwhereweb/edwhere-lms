'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  FileText,
  Link2,
  ClipboardList,
  CalendarClock,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { BatchContentModule, BatchContentItem } from '@/actions/get-batches';
import { AddSessionForm } from './add-session-form';
import { SessionDetail } from './session-detail';

const ITEM_TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  PDF: { icon: FileText, label: 'PDF', color: 'text-rose-500' },
  RESOURCE_LINK: { icon: Link2, label: 'Resource Link', color: 'text-blue-500' },
  TASK: { icon: ClipboardList, label: 'Task', color: 'text-amber-500' },
  OFFLINE_SESSION: { icon: CalendarClock, label: 'Offline Session', color: 'text-violet-500' }
};

interface BatchContentEditorProps {
  batchId: string;
  initialModules: BatchContentModule[];
}

// ── Inline editable field ──────────────────────────────────────────────────
function InlineEdit({
  value,
  onSave,
  className
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [loading, setLoading] = useState(false);

  const commit = async () => {
    if (!draft.trim() || draft === value) {
      setEditing(false);
      return;
    }
    try {
      setLoading(true);
      await onSave(draft.trim());
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-7 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <>
            <button onClick={commit}>
              <Check className="h-4 w-4 text-emerald-500" />
            </button>
            <button onClick={() => setEditing(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </>
        )}
      </div>
    );
  }
  return (
    <span
      className={cn('cursor-pointer hover:text-primary flex items-center gap-1 group', className)}
      onClick={() => setEditing(true)}
    >
      {value}
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </span>
  );
}

// ── Add Item Form (collapsed/expanded toggle) ──────────────────────────────
function AddItemForm({
  batchId,
  moduleId,
  onCreated
}: {
  batchId: string;
  moduleId: string;
  onCreated: (item: BatchContentItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'PDF' | 'RESOURCE_LINK' | 'TASK'>('PDF');
  const [title, setTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [description, setDescription] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [submissionType, setSubmissionType] = useState<'OFFLINE' | 'ONLINE'>('OFFLINE');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setOpen(false);
    setTitle('');
    setPdfUrl('');
    setResourceUrl('');
    setDescription('');
    setMaxMarks('');
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      setLoading(true);
      const payload: Record<string, unknown> = { type, title: title.trim() };
      if (type === 'PDF') payload.pdfUrl = pdfUrl;
      if (type === 'RESOURCE_LINK') payload.resourceUrl = resourceUrl;
      if (type === 'TASK') {
        if (!description.trim() || !maxMarks) {
          toast.error('Task requires description and max marks');
          return;
        }
        payload.description = description.trim();
        payload.maxMarks = parseFloat(maxMarks);
        payload.submissionType = submissionType;
      }
      const { data } = await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items`,
        payload
      );
      onCreated(data);
      reset();
      toast.success('Item added');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="flex gap-2 flex-wrap mt-2">
        {(['PDF', 'RESOURCE_LINK', 'TASK'] as const).map((t) => {
          const meta = ITEM_TYPE_META[t];
          const Icon = meta.icon;
          return (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs border rounded px-2 py-1 hover:bg-muted/60 transition-colors text-muted-foreground"
            >
              <Icon className={cn('h-3.5 w-3.5', meta.color)} />+ {meta.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 mt-3 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Add {ITEM_TYPE_META[type].label}</span>
        <button onClick={reset}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item title…"
          className="h-8 text-sm"
        />
      </div>

      {type === 'PDF' && (
        <div className="space-y-2">
          <Label className="text-xs">PDF URL</Label>
          <Input
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="https://…"
            className="h-8 text-sm"
          />
        </div>
      )}

      {type === 'RESOURCE_LINK' && (
        <div className="space-y-2">
          <Label className="text-xs">Resource URL</Label>
          <Input
            value={resourceUrl}
            onChange={(e) => setResourceUrl(e.target.value)}
            placeholder="https://…"
            className="h-8 text-sm"
          />
        </div>
      )}

      {type === 'TASK' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Task Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-sm"
              placeholder="What should students do?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Max Marks</Label>
              <Input
                type="number"
                min="1"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Submission Type</Label>
              <select
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value as 'OFFLINE' | 'ONLINE')}
                className="w-full h-8 text-sm border rounded-md bg-background px-2"
              >
                <option value="OFFLINE">Offline</option>
                <option value="ONLINE">Online (Drive Link)</option>
              </select>
            </div>
          </div>
        </>
      )}

      <Button size="sm" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Item'}
      </Button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function BatchContentEditor({ batchId, initialModules }: BatchContentEditorProps) {
  const router = useRouter();
  const [modules, setModules] = useState<BatchContentModule[]>(initialModules);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [deletingModule, setDeletingModule] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error('Module title is required');
      return;
    }
    try {
      setAddingModule(true);
      const { data } = await axios.post(`/api/teacher/offline-batches/${batchId}/modules`, {
        title: newModuleTitle.trim()
      });
      setModules((prev) => [...prev, { ...data, items: [] }]);
      setNewModuleTitle('');
      toast.success('Module added');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setAddingModule(false);
    }
  };

  const handleRenameModule = async (moduleId: string, title: string) => {
    await axios.patch(`/api/teacher/offline-batches/${batchId}/modules/${moduleId}`, { title });
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, title } : m)));
    toast.success('Module renamed');
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its items?')) return;
    try {
      setDeletingModule(moduleId);
      await axios.delete(`/api/teacher/offline-batches/${batchId}/modules/${moduleId}`);
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
      toast.success('Module deleted');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setDeletingModule(null);
    }
  };

  const handleMoveModule = async (moduleId: string, dir: 'up' | 'down') => {
    const idx = modules.findIndex((m) => m.id === moduleId);
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === modules.length - 1)) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    const reordered = [...modules];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setModules(reordered);
    await Promise.all([
      axios.patch(`/api/teacher/offline-batches/${batchId}/modules/${reordered[idx].id}`, {
        position: idx
      }),
      axios.patch(`/api/teacher/offline-batches/${batchId}/modules/${reordered[newIdx].id}`, {
        position: newIdx
      })
    ]).catch(() => {
      toast.error('Reorder failed');
      router.refresh();
    });
  };

  const handleItemCreated = (moduleId: string, item: BatchContentItem) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, items: [...m.items, item] } : m))
    );
  };

  const handleDeleteItem = async (batchId: string, moduleId: string, itemId: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      setDeletingItem(itemId);
      await axios.delete(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}`
      );
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m
        )
      );
      toast.success('Item deleted');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setDeletingItem(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Module list */}
      {modules.map((mod, modIdx) => (
        <div key={mod.id} className="border rounded-lg overflow-hidden">
          {/* Module header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b">
            <div className="flex flex-col gap-0.5 mr-1">
              <button
                onClick={() => handleMoveModule(mod.id, 'up')}
                disabled={modIdx === 0}
                className="disabled:opacity-30 hover:text-primary transition-colors"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleMoveModule(mod.id, 'down')}
                disabled={modIdx === modules.length - 1}
                className="disabled:opacity-30 hover:text-primary transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <InlineEdit
              value={mod.title}
              onSave={(title) => handleRenameModule(mod.id, title)}
              className="font-semibold text-sm flex-1"
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive ml-auto"
              onClick={() => handleDeleteModule(mod.id)}
              disabled={deletingModule === mod.id}
            >
              {deletingModule === mod.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Items */}
          <div className="divide-y">
            {mod.items.map((item) => {
              const meta = ITEM_TYPE_META[item.type] ?? ITEM_TYPE_META.PDF;
              const Icon = meta.icon;
              return (
                <div key={item.id} className="flex flex-col">
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', meta.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.type === 'PDF' && item.pdfUrl && (
                        <a
                          href={item.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block"
                        >
                          {item.pdfUrl}
                        </a>
                      )}
                      {item.type === 'RESOURCE_LINK' && item.resourceUrl && (
                        <a
                          href={item.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block"
                        >
                          {item.resourceUrl}
                        </a>
                      )}
                      {item.type === 'TASK' && item.task && (
                        <p className="text-xs text-muted-foreground">
                          {item.task.submissionType} · {item.task.maxMarks} marks
                        </p>
                      )}
                      {item.type === 'OFFLINE_SESSION' && (
                        <button
                          onClick={() =>
                            setExpandedSessionId((p) => (p === item.id ? null : item.id))
                          }
                          className="text-xs text-blue-500 hover:underline mt-0.5 flex items-center gap-1"
                        >
                          {expandedSessionId === item.id ? 'Close details' : 'Configure session…'}
                        </button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteItem(batchId, mod.id, item.id)}
                      disabled={deletingItem === item.id}
                    >
                      {deletingItem === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  {expandedSessionId === item.id && item.type === 'OFFLINE_SESSION' && (
                    <div className="bg-muted/10 p-4 border-t shadow-inner">
                      <SessionDetail batchId={batchId} moduleId={mod.id} itemId={item.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Item */}
          <div className="px-4 pb-4">
            <AddItemForm
              batchId={batchId}
              moduleId={mod.id}
              onCreated={(item) => handleItemCreated(mod.id, item)}
            />
            <div className="mt-2" />
            <AddSessionForm
              batchId={batchId}
              moduleId={mod.id}
              onCreated={(item) => handleItemCreated(mod.id, item as BatchContentItem)}
            />
          </div>
        </div>
      ))}

      {/* Add Module */}
      <div className="flex gap-2 items-center pt-2">
        <Input
          id="new-module-title"
          placeholder="New module heading…"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          className="max-w-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddModule();
          }}
        />
        <Button
          id="add-module-btn"
          size="sm"
          onClick={handleAddModule}
          disabled={addingModule || !newModuleTitle.trim()}
        >
          {addingModule ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add Module
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
