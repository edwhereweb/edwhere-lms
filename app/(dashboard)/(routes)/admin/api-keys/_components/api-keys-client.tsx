'use client';

import { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Key, Plus, Trash2, Copy, Check, Power, ShieldAlert, Loader2, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

export interface ApiKeyItem {
  id: string;
  name: string;
  scopes: string;
  isActive: boolean;
  createdBy: string;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiKeysClientProps {
  initialKeys: ApiKeyItem[];
}

export function ApiKeysClient({ initialKeys }: ApiKeysClientProps) {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatedSuccessOpen, setIsCreatedSuccessOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState('contacts:read');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the key');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await axios.post('/api/admin/api-keys', {
        name: newKeyName.trim(),
        scopes: newKeyScopes.trim() || 'contacts:read'
      });

      setKeys((prev) => [data, ...prev]);
      setGeneratedRawKey(data.rawKey);
      setIsCreateOpen(false);
      setIsCreatedSuccessOpen(true);
      setNewKeyName('');
      setNewKeyScopes('contacts:read');
      toast.success('API key generated successfully');
      router.refresh();
    } catch {
      toast.error('Failed to create API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (key: ApiKeyItem) => {
    try {
      const { data } = await axios.patch(`/api/admin/api-keys/${key.id}`, {
        isActive: !key.isActive
      });

      setKeys((prev) => prev.map((k) => (k.id === key.id ? { ...k, isActive: data.isActive } : k)));
      toast.success(data.isActive ? 'API key enabled' : 'API key disabled');
      router.refresh();
    } catch {
      toast.error('Failed to update API key status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/api-keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete API key');
    }
  };

  const handleCopyRawKey = () => {
    if (!generatedRawKey) return;
    navigator.clipboard.writeText(generatedRawKey);
    setCopiedKey(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(true);
    toast.success('Endpoint copied to clipboard');
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Active Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Keys authenticate incoming requests from WACRM and automation webhooks.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Secret Key
        </Button>
      </div>

      {/* Keys table */}
      <Card>
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-3">
              <Key className="h-8 w-8 mx-auto opacity-40" />
              <p className="text-sm">No API keys created yet.</p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                Generate your first key
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Scopes</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Last Used</th>
                    <th className="px-6 py-3 font-medium">Created</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        {k.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.split(',').map((s) => (
                            <Badge key={s} variant="secondary" className="font-mono text-[11px]">
                              {s.trim()}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {k.isActive ? (
                          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Disabled</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {k.lastUsedAt ? format(new Date(k.lastUsedAt), 'PPp') : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(k.createdAt), 'PP')}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(k)}
                          title={k.isActive ? 'Disable key' : 'Enable key'}
                        >
                          <Power
                            className={`h-4 w-4 ${k.isActive ? 'text-amber-500' : 'text-emerald-500'}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(k.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration guide card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">WACRM Integration Reference</CardTitle>
          </div>
          <CardDescription>
            Use this endpoint in WACRM automation flows to fetch course and webinar enrollments for
            any contact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Endpoint URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2.5 rounded bg-muted font-mono text-xs overflow-x-auto">
                GET /api/v1/contacts/enrollments?phone=&#123;phone&#125;&email=&#123;email&#125;
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopyEndpoint('/api/v1/contacts/enrollments?phone={phone}&email={email}')
                }
              >
                {copiedEndpoint ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Authentication Header
            </label>
            <div className="p-3 bg-muted rounded font-mono text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Header:</span> x-api-key:
                &lt;YOUR_API_KEY&gt;
              </div>
              <div>
                <span className="text-muted-foreground">Or:</span> Authorization: Bearer
                &lt;YOUR_API_KEY&gt;
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Example Response
            </label>
            <pre className="p-3 bg-muted rounded font-mono text-xs overflow-x-auto text-slate-800 dark:text-slate-200">
              {`{
  "contact": {
    "name": "Jane Doe",
    "phone": "919876543210",
    "email": "jane@example.com"
  },
  "courses": [
    {
      "id": "66f1...",
      "title": "Fullstack Web Development",
      "enrolledAt": "2026-10-14T10:00:00.000Z",
      "status": "active",
      "whatsappGroupUrl": "https://chat.whatsapp.com/..."
    }
  ],
  "webinars": [
    {
      "id": "66f2...",
      "title": "Mastering Next.js",
      "eventDate": "2026-10-20T14:00:00.000Z",
      "status": "active",
      "whatsappGroupUrl": "https://chat.whatsapp.com/..."
    }
  ]
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a secret key for external integration. Only the cryptographic hash is stored in
              our database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="key-name" className="text-sm font-medium">
                Key Name / Description
              </label>
              <Input
                id="key-name"
                placeholder="e.g. WACRM Production"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="key-scopes" className="text-sm font-medium">
                Permissions / Scopes
              </label>
              <Input
                id="key-scopes"
                placeholder="contacts:read"
                value={newKeyScopes}
                onChange={(e) => setNewKeyScopes(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated permissions. Default: <code>contacts:read</code>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raw Key Display Modal (shown ONCE) */}
      <Dialog open={isCreatedSuccessOpen} onOpenChange={setIsCreatedSuccessOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <ShieldAlert className="h-5 w-5" />
              <DialogTitle>Save Your API Key Now</DialogTitle>
            </div>
            <DialogDescription>
              This key will <strong>never be shown again</strong>. If you lose this key, you will
              have to generate a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 bg-muted rounded border border-amber-200 dark:border-amber-900/50">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground block mb-1">
                Your Secret API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm break-all select-all flex-1 text-primary">
                  {generatedRawKey}
                </code>
                <Button size="sm" onClick={handleCopyRawKey} className="shrink-0 gap-1.5">
                  {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedKey ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsCreatedSuccessOpen(false)}>
              I have saved my key securely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
