'use client';

import { useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Phone, Mail, MessageSquare, Calendar, Tag, Search, X } from 'lucide-react';

/* ─── Constants ─── */
export const STATUS_OPTIONS = [
  {
    value: 'NEW_LEAD',
    label: 'New Lead',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
  },
  {
    value: 'DECISION_PENDING',
    label: 'Decision Pending',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  },
  {
    value: 'RNR1',
    label: 'RNR 1',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  },
  {
    value: 'RNR2',
    label: 'RNR 2',
    color: 'bg-orange-200 text-orange-900 dark:bg-orange-800/30 dark:text-orange-200'
  },
  {
    value: 'PAYMENT_PENDING',
    label: 'Payment Pending',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  },
  {
    value: 'NOT_INTERESTED',
    label: 'Not Interested',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  },
  {
    value: 'OFFLINE_INTERESTED',
    label: 'Offline Interested',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  },
  {
    value: 'FUTURE_OPTIONS',
    label: 'Future Options',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
] as const;

type Status = (typeof STATUS_OPTIONS)[number]['value'];

const SOURCE_LABELS: Record<string, string> = {
  GENERAL_WEBSITE_ENQUIRY: 'Website Enquiry',
  MANUAL_ENTRY: 'Manual Entry',
  PHONE_CALL: 'Phone Call',
  WHATSAPP: 'WhatsApp',
  SOCIAL_MEDIA: 'Social Media',
  REFERRAL: 'Referral'
};

/* ─── Types ─── */
interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  source: string;
  status: string;
  notes: string | null;
  createdAt: Date | string;
}

interface LeadsTableProps {
  leads: Lead[];
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${opt?.color ?? 'bg-slate-100 text-slate-700'}`}
    >
      {opt?.label ?? status}
    </span>
  );
}

/* ─── Lead Detail Dialog ─── */
function LeadDialog({
  lead,
  onClose,
  onSaved
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<Status>(lead.status as Status);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/leads/${lead.id}`, { status, notes });
      toast.success('Lead updated');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              <a href={`tel:${lead.phone}`} className="hover:underline">
                {lead.phone}
              </a>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              <a href={`mailto:${lead.email}`} className="hover:underline">
                {lead.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Tag className="h-3.5 w-3.5" />
              <span>{SOURCE_LABELS[lead.source] ?? lead.source.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(lead.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> ENQUIRY
            </div>
            <p className="text-sm bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-slate-700 dark:text-slate-300 leading-relaxed">
              {lead.message}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
              STATUS
            </label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
              NOTES
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this lead…"
              rows={4}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Leads Table ─── */
export function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Lead | null>(null);

  // Search state
  const [search, setSearch] = useState('');

  // Filter state — "ALL" means no filter applied
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Unique sources from the current leads list
  const sources = useMemo(() => {
    const set = new Set(leads.map((l) => l.source));
    return Array.from(set).sort();
  }, [leads]);

  // Filtered + searched leads
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => {
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
      const matchSource = sourceFilter === 'ALL' || l.source === sourceFilter;

      return matchSearch && matchStatus && matchSource;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const hasFilters = search || statusFilter !== 'ALL' || sourceFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSourceFilter('ALL');
  };

  return (
    <>
      {selected && (
        <LeadDialog
          lead={selected}
          onClose={() => setSelected(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {/* ── Search + Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s] ?? s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Received</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  {hasFilters ? 'No leads match your search or filters.' : 'No leads yet.'}
                </td>
              </tr>
            )}
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                onClick={() => setSelected(lead)}
              >
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                  {lead.name}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  <a
                    href={`tel:${lead.phone}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.phone}
                  </a>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                  <a
                    href={`mailto:${lead.email}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                  {SOURCE_LABELS[lead.source] ?? lead.source.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                  {format(new Date(lead.createdAt), 'dd MMM yyyy')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(lead);
                    }}
                    className="text-xs h-7"
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t text-xs text-slate-400">
            Showing {filtered.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </>
  );
}
