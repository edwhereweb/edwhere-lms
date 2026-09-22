'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Users, Download, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface Registration {
  id: string;
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  createdAt: string;
}

interface Props {
  webinarId: string;
}

export function RegistrationsPanel({ webinarId }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get<Registration[]>(
          `/api/admin/webinars/${webinarId}/registrations`
        );
        setRegistrations(data);
      } catch {
        toast.error('Failed to load registrations');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [webinarId]);

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.includes(q)
    );
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/webinars/${webinarId}/registrations/export`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webinar-registrations-${webinarId}-${format(new Date(), 'yyyyMMdd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${registrations.length} registration(s)`);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">
            Registrations{' '}
            <span className="text-muted-foreground font-normal text-sm">
              ({registrations.length})
            </span>
          </h3>
        </div>
        <Button
          id="export-registrations-btn"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || registrations.length === 0}
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          id="reg-search"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-10 text-muted-foreground text-sm">
            {registrations.length === 0
              ? 'No registrations yet.'
              : 'No registrations match the search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium text-right">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r, i) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.countryCode} {r.phone}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {format(new Date(r.createdAt), 'MMM d, yyyy h:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              {filtered.length} registration{filtered.length !== 1 ? 's' : ''}
              {search && ` (filtered from ${registrations.length})`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
