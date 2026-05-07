'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Award, Plus, Upload, Loader2, Copy, Search, Download, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IssueCertificateModal } from './_components/issue-modal';
import { BulkIssueModal } from './_components/bulk-modal';
import toast from 'react-hot-toast';

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

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('All');

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
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

  // Derive unique program names for the dropdown
  const programOptions = useMemo(() => {
    const names = Array.from(new Set(certificates.map((c) => c.courseName))).sort();
    return names;
  }, [certificates]);

  // Apply all filters
  const filtered = useMemo(() => {
    return certificates.filter((cert) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        cert.recipientName.toLowerCase().includes(q) ||
        cert.courseName.toLowerCase().includes(q) ||
        cert.credentialId.toLowerCase().includes(q);
      const matchesProgram = !programFilter || cert.courseName === programFilter;
      const matchesMode =
        modeFilter === 'All' || cert.deliveryMode.toLowerCase() === modeFilter.toLowerCase();
      return matchesSearch && matchesProgram && matchesMode;
    });
  }, [certificates, search, programFilter, modeFilter]);

  const hasActiveFilters = search || programFilter || modeFilter !== 'All';

  const clearFilters = () => {
    setSearch('');
    setProgramFilter('');
    setModeFilter('All');
  };

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

      // Style header row
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

      // Zebra stripe the data rows
      ws.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNumber % 2 === 0 ? 'FFF7F7F7' : 'FFFFFFFF' }
          };
        }
        row.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } }
        };
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const label = programFilter ? programFilter.replace(/\s+/g, '_') : 'All_Programs';
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

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-3">
        {/* Search */}
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

        {/* Program filter */}
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

        {/* Mode filter chips */}
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

        {/* Clear + Export */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
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

      {/* Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
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
                  <th className="px-6 py-3 font-medium">Recipient</th>
                  <th className="px-6 py-3 font-medium">Program</th>
                  <th className="px-6 py-3 font-medium">Credential ID</th>
                  <th className="px-6 py-3 font-medium">Date Achieved</th>
                  <th className="px-6 py-3 font-medium text-right">Issued On</th>
                  <th className="px-6 py-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((cert) => (
                  <tr key={cert.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{cert.recipientName}</td>
                    <td className="px-6 py-4">
                      {cert.courseName}
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {cert.duration} · {cert.deliveryMode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">{cert.dateOfAchievement}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {format(new Date(cert.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleRevoke(cert)}
                        disabled={revoking === cert.id}
                        title="Revoke & delete certificate"
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                      >
                        {revoking === cert.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  );
}
