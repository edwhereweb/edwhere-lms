'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
import { MessageSquare, Calendar, Tag, Search, X, TrophyIcon } from 'lucide-react';
import { CloseLeadDialog } from './close-lead-dialog';
import { CampaignCombobox } from './campaign-combobox';

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
    color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300'
  },
  {
    value: 'ENROLMENT_PENDING',
    label: 'Enrolment Pending',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  },
  {
    value: 'NOT_INTERESTED',
    label: 'Not Interested',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  },
  {
    value: 'OFFLINE_INTERESTED',
    label: 'Offline Interested',
    color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-300'
  },
  {
    value: 'FUTURE_OPTIONS',
    label: 'Future Options',
    color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
  },
  {
    value: 'CLOSED_WON',
    label: 'Closed — Won',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
  },
  {
    value: 'CLOSED_LOST',
    label: 'Closed — Lost',
    color: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
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
  email: string | null;
  message: string;
  source: string;
  status: string;
  notes: string | null;
  campaignId: string | null;
  campaign?: { id: string; name: string } | null;
  createdAt: Date | string;
}

interface LeadsTableProps {
  leads: Lead[];
  page: number;
  totalPages: number;
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${opt?.color ?? 'bg-neutral-100 text-neutral-700'}`}
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
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [email, setEmail] = useState(lead.email || '');
  const [message, setMessage] = useState(lead.message);
  const [status, setStatus] = useState<Status>(lead.status as Status);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [campaignId, setCampaignId] = useState<string | null>(lead.campaignId);
  const [saving, setSaving] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const isClosed = lead.status === 'CLOSED_WON' || lead.status === 'CLOSED_LOST';

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/leads/${lead.id}`, {
        name,
        phone,
        email,
        message,
        status,
        notes,
        campaignId
      });
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
    <>
      {showClose && (
        <CloseLeadDialog
          leadId={lead.id}
          leadName={lead.name}
          initialCampaignId={lead.campaign?.id}
          open={showClose}
          onClose={() => setShowClose(false)}
        />
      )}
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{lead.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 overflow-y-auto px-1 flex-1">
            {/* Left Column - Details */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  NAME
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isClosed} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  PHONE
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isClosed}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  EMAIL
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isClosed}
                  type="email"
                />
              </div>

              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-sm">
                <Tag className="h-3.5 w-3.5" />
                <span>{SOURCE_LABELS[lead.source] ?? lead.source.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  CAMPAIGN
                </label>
                {isClosed ? (
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {lead.campaign?.name || 'None'}
                  </div>
                ) : (
                  <CampaignCombobox value={campaignId} onChange={setCampaignId} />
                )}
              </div>
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-sm">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(lead.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
              </div>
            </div>

            {/* Right Column - Enquiries, Notes, Status */}
            <div className="space-y-5 flex flex-col h-full">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> ENQUIRY
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isClosed}
                  rows={4}
                  className="text-sm bg-neutral-50 dark:bg-neutral-900 leading-relaxed resize-none"
                />
              </div>

              {!isClosed ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                      STATUS
                    </label>
                    <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.filter(
                          (o) => o.value !== 'CLOSED_WON' && o.value !== 'CLOSED_LOST'
                        ).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                      NOTES
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this lead…"
                      className="flex-1 min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 mt-auto">
                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                      {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowClose(true)}
                      className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                    >
                      <TrophyIcon className="h-3.5 w-3.5" />
                      Close Lead
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border bg-neutral-50 dark:bg-neutral-900 p-4 text-sm text-neutral-500 dark:text-neutral-400 mt-auto">
                  This lead has been closed. View payment details in the{' '}
                  <a
                    href="/marketer/payments"
                    className="text-[#F80602] hover:underline font-medium"
                  >
                    Payment Tracker
                  </a>
                  .
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Main Leads Table ─── */
export function LeadsTable({ leads, page, totalPages }: LeadsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<Lead | null>(null);

  // URL-driven filter states
  const statusFilter = searchParams.get('status') || 'ALL';
  const sourceFilter = searchParams.get('source') || 'ALL';

  // Local state for debounced search
  const [search, setSearch] = useState(searchParams.get('q') || '');

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'ALL') {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      // reset to page 1 on filter change
      if (key !== 'page') {
        params.set('page', '1');
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (searchParams.get('q') || '')) {
        updateFilter('q', search);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, searchParams, updateFilter]);

  // Unique sources from the known list
  const sources = useMemo(() => {
    return Object.keys(SOURCE_LABELS).sort();
  }, []);

  const hasFilters = search || statusFilter !== 'ALL' || sourceFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    router.push(pathname);
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => updateFilter('status', v)}>
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
        <Select value={sourceFilter} onValueChange={(v) => updateFilter('source', v)}>
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
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Source</th>
              <th className="text-left px-4 py-3">Campaign</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Received</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-neutral-400">
                  {hasFilters ? 'No leads match your search or filters.' : 'No leads yet.'}
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                onClick={() => setSelected(lead)}
              >
                <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-100">
                  {lead.name}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  <a
                    href={`tel:${lead.phone}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.phone}
                  </a>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 max-w-[180px] truncate">
                  <a
                    href={`mailto:${lead.email}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                  {SOURCE_LABELS[lead.source] ?? lead.source.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                  {lead.campaign?.name || '-'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap">
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
        {leads.length > 0 && (
          <div className="px-4 py-2 border-t text-xs text-neutral-400">
            Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-white dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateFilter('page', String(page - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateFilter('page', String(page + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
