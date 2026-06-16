'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  Award,
  Plus,
  Upload,
  Loader2,
  Copy,
  Search,
  Download,
  X,
  Trash2,
  ArrowUpDown,
  Pencil,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IssueCertificateModal } from './_components/issue-modal';
import { BulkIssueModal } from './_components/bulk-modal';
import { EditCertificateModal } from './_components/edit-modal';
import { BulkDeleteModal } from './_components/bulk-delete-modal';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

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

const DELIVERY_MODES = ['All', 'Online', 'Offline', 'Hybrid'] as const;

type SortKey = 'issuedDesc' | 'issuedAsc' | 'awardDesc' | 'awardAsc' | 'nameAsc' | 'nameDesc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'issuedDesc', label: 'Issued On — Newest first' },
  { value: 'issuedAsc', label: 'Issued On — Oldest first' },
  { value: 'awardDesc', label: 'Award Date — Newest first' },
  { value: 'awardAsc', label: 'Award Date — Oldest first' },
  { value: 'nameAsc', label: 'Recipient — A → Z' },
  { value: 'nameDesc', label: 'Recipient — Z → A' }
];

function sortCerts(certs: Certificate[], key: SortKey): Certificate[] {
  return [...certs].sort((a, b) => {
    switch (key) {
      case 'issuedDesc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'issuedAsc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'awardDesc':
        return b.dateOfAchievement.localeCompare(a.dateOfAchievement);
      case 'awardAsc':
        return a.dateOfAchievement.localeCompare(b.dateOfAchievement);
      case 'nameAsc':
        return a.recipientName.localeCompare(b.recipientName);
      case 'nameDesc':
        return b.recipientName.localeCompare(a.recipientName);
    }
  });
}

function inDateRange(dateStr: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  try {
    const d = startOfDay(parseISO(dateStr));
    if (from && to)
      return isWithinInterval(d, {
        start: startOfDay(parseISO(from)),
        end: endOfDay(parseISO(to))
      });
    if (from) return d >= startOfDay(parseISO(from));
    if (to) return d <= endOfDay(parseISO(to));
  } catch {
    // malformed date — don't filter
  }
  return true;
}

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [issuedFrom, setIssuedFrom] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [awardFrom, setAwardFrom] = useState('');
  const [awardTo, setAwardTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('issuedDesc');

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Single-row actions
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/admin/certificates');
      setCertificates(data);
    } catch {
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Clear selection when filtered set changes to avoid stale ghosts
  useEffect(() => {
    setSelected(new Set());
  }, [search, programFilter, modeFilter, issuedFrom, issuedTo, awardFrom, awardTo, sortKey]);

  const programOptions = useMemo(() => {
    return Array.from(new Set(certificates.map((c) => c.courseName))).sort();
  }, [certificates]);

  const filtered = useMemo(() => {
    const base = certificates.filter((cert) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        cert.recipientName.toLowerCase().includes(q) ||
        cert.courseName.toLowerCase().includes(q) ||
        cert.credentialId.toLowerCase().includes(q);
      const matchesProgram = !programFilter || cert.courseName === programFilter;
      const matchesMode =
        modeFilter === 'All' || cert.deliveryMode.toLowerCase() === modeFilter.toLowerCase();
      const matchesIssuedDate = inDateRange(cert.createdAt.slice(0, 10), issuedFrom, issuedTo);
      const matchesAwardDate = inDateRange(cert.dateOfAchievement, awardFrom, awardTo);
      return (
        matchesSearch && matchesProgram && matchesMode && matchesIssuedDate && matchesAwardDate
      );
    });
    return sortCerts(base, sortKey);
  }, [
    certificates,
    search,
    programFilter,
    modeFilter,
    issuedFrom,
    issuedTo,
    awardFrom,
    awardTo,
    sortKey
  ]);

  const hasActiveFilters =
    search ||
    programFilter ||
    modeFilter !== 'All' ||
    issuedFrom ||
    issuedTo ||
    awardFrom ||
    awardTo ||
    sortKey !== 'issuedDesc';

  const clearFilters = () => {
    setSearch('');
    setProgramFilter('');
    setModeFilter('All');
    setIssuedFrom('');
    setIssuedTo('');
    setAwardFrom('');
    setAwardTo('');
    setSortKey('issuedDesc');
  };

  // ── Selection helpers ─────────────────────────────────────────────────────

  const allFilteredIds = filtered.map((c) => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someSelected = allFilteredIds.some((id) => selected.has(id));
  const selectedCount = allFilteredIds.filter((id) => selected.has(id)).length;

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelected(new Set());

  // ── Actions ───────────────────────────────────────────────────────────────

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Credential ID copied!');
  };

  const handleRevoke = async (cert: Certificate) => {
    const confirmed = window.confirm(
      `Revoke certificate for "${cert.recipientName}" (${cert.credentialId})?\n\nThis will permanently delete the record and the credential will no longer be verifiable.`
    );
    if (!confirmed) return;
    try {
      setRevoking(cert.id);
      await axios.delete(`/api/admin/certificates/${cert.id}`);
      setCertificates((prev) => prev.filter((c) => c.id !== cert.id));
      toast.success('Certificate revoked and deleted.');
    } catch {
      toast.error('Failed to revoke certificate.');
    } finally {
      setRevoking(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected).filter((id) => allFilteredIds.includes(id));
    try {
      await axios.post('/api/admin/certificates/bulk-delete', { ids });
      setCertificates((prev) => prev.filter((c) => !ids.includes(c.id)));
      clearSelection();
      setIsBulkDeleteOpen(false);
      toast.success(`${ids.length} certificate${ids.length !== 1 ? 's' : ''} deleted.`);
    } catch {
      toast.error('Bulk delete failed.');
      throw new Error('bulk delete failed'); // rethrow so modal keeps loading=false
    }
  };

  const handleEditSuccess = (updated: Certificate) => {
    setCertificates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const exportToExcel = async () => {
    if (filtered.length === 0) {
      toast.error('No certificates to export.');
      return;
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Certificates');

      ws.columns = [
        { header: 'Recipient Name', key: 'recipientName', width: 28 },
        { header: 'Program / Course', key: 'courseName', width: 36 },
        { header: 'Duration', key: 'duration', width: 16 },
        { header: 'Delivery Mode', key: 'deliveryMode', width: 16 },
        { header: 'Date of Achievement', key: 'dateOfAchievement', width: 20 },
        { header: 'Credential ID', key: 'credentialId', width: 26 },
        { header: 'Issued On', key: 'createdAt', width: 20 }
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF171717' } };
      headerRow.alignment = { vertical: 'middle' };
      headerRow.height = 22;

      filtered.forEach((cert) => {
        ws.addRow({
          recipientName: cert.recipientName,
          courseName: cert.courseName,
          duration: cert.duration,
          deliveryMode: cert.deliveryMode,
          dateOfAchievement: cert.dateOfAchievement,
          credentialId: cert.credentialId,
          createdAt: format(new Date(cert.createdAt), 'yyyy-MM-dd')
        });
      });

      ws.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNumber % 2 === 0 ? 'FFF7F7F7' : 'FFFFFFFF' }
          };
        }
        row.border = { bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } } };
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      const parts: string[] = [];
      if (programFilter) parts.push(programFilter.replace(/\s+/g, '_'));
      if (modeFilter !== 'All') parts.push(modeFilter);
      if (issuedFrom || issuedTo)
        parts.push(`issued_${issuedFrom || 'start'}_to_${issuedTo || 'now'}`);
      if (awardFrom || awardTo) parts.push(`award_${awardFrom || 'start'}_to_${awardTo || 'now'}`);
      const label = parts.length > 0 ? parts.join('_') : 'All';

      a.href = url;
      a.download = `Certificates_${label}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} certificate(s)`);
    } catch {
      toast.error('Export failed. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            Certificate Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Issue and manage verifiable certificates for students.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsBulkModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Issue
          </Button>
          <Button onClick={() => setIsIssueModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Issue Certificate
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        {/* Row 1 — search + program + mode chips */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              id="cert-search"
              placeholder="Search by name, program or credential ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="min-w-[200px]">
            <select
              id="program-filter"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full h-9 text-sm border rounded-md bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Programs</option>
              {programOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery mode chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {DELIVERY_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setModeFilter(mode)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  modeFilter === mode
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2 — date ranges + sort + clear + export */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Issue Date range */}
          <fieldset className="border rounded-md px-3 pt-1 pb-2 text-xs min-w-[240px]">
            <legend className="px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Issue Date
            </legend>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="issued-from"
                type="date"
                value={issuedFrom}
                max={issuedTo || undefined}
                onChange={(e) => setIssuedFrom(e.target.value)}
                className="h-8 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
              />
              <span className="text-muted-foreground shrink-0">to</span>
              <input
                id="issued-to"
                type="date"
                value={issuedTo}
                min={issuedFrom || undefined}
                onChange={(e) => setIssuedTo(e.target.value)}
                className="h-8 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
              />
            </div>
          </fieldset>

          {/* Award Date range */}
          <fieldset className="border rounded-md px-3 pt-1 pb-2 text-xs min-w-[240px]">
            <legend className="px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Award Date
            </legend>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="award-from"
                type="date"
                value={awardFrom}
                max={awardTo || undefined}
                onChange={(e) => setAwardFrom(e.target.value)}
                className="h-8 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
              />
              <span className="text-muted-foreground shrink-0">to</span>
              <input
                id="award-to"
                type="date"
                value={awardTo}
                min={awardFrom || undefined}
                onChange={(e) => setAwardTo(e.target.value)}
                className="h-8 text-xs border rounded px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
              />
            </div>
          </fieldset>

          {/* Sort */}
          <div className="flex items-center gap-1.5 min-w-[220px]">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              id="sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="flex-1 h-9 text-sm border rounded-md bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear + Export */}
          <div className="flex items-center gap-2 ml-auto">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={filtered.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Excel
              {filtered.length > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Floating bulk-action bar */}
      {someSelected && selectedCount > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-foreground text-background rounded-full shadow-2xl px-5 py-2.5 text-sm font-medium border border-border/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="font-semibold">{selectedCount} selected</span>
          <div className="w-px h-4 bg-background/30" />
          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 text-background/70 hover:text-background transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
          <div className="w-px h-4 bg-background/30" />
          <button
            id="bulk-delete-trigger"
            onClick={() => setIsBulkDeleteOpen(true)}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete {selectedCount}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>
              {certificates.length === 0
                ? 'No certificates have been issued yet.'
                : 'No certificates match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
                <tr>
                  {/* Select-all checkbox */}
                  <th className="px-4 py-3 w-10">
                    <button
                      id="select-all-certs"
                      onClick={toggleAll}
                      title={allSelected ? 'Deselect all' : 'Select all visible'}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : someSelected ? (
                        <CheckSquare className="w-4 h-4 opacity-50" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Credential ID</th>
                  <th className="px-4 py-3 font-medium">Award Date</th>
                  <th className="px-4 py-3 font-medium text-right">Issued On</th>
                  <th className="px-4 py-3 font-medium w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((cert) => {
                  const isChecked = selected.has(cert.id);
                  return (
                    <tr
                      key={cert.id}
                      className={cn(
                        'transition-colors',
                        isChecked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleRow(cert.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Select certificate for ${cert.recipientName}`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 font-medium">{cert.recipientName}</td>
                      <td className="px-4 py-4">
                        {cert.courseName}
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {cert.duration} · {cert.deliveryMode}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                            {cert.credentialId}
                          </code>
                          <button
                            onClick={() => copyToClipboard(cert.credentialId)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">{cert.dateOfAchievement}</td>
                      <td className="px-4 py-4 text-right text-muted-foreground">
                        {format(new Date(cert.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => setEditingCert(cert)}
                            title="Edit certificate"
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleRevoke(cert)}
                            disabled={revoking === cert.id}
                            title="Revoke & delete certificate"
                            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          >
                            {revoking === cert.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>
                {filtered.length} certificate{filtered.length !== 1 ? 's' : ''}
                {hasActiveFilters ? ' (filtered)' : ''}
              </span>
              {someSelected && selectedCount > 0 && (
                <span className="text-primary font-medium">{selectedCount} selected</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <IssueCertificateModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={fetchCertificates}
      />

      <BulkIssueModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={fetchCertificates}
      />

      <EditCertificateModal
        cert={editingCert}
        onClose={() => setEditingCert(null)}
        onSuccess={handleEditSuccess}
      />

      <BulkDeleteModal
        count={selectedCount}
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
