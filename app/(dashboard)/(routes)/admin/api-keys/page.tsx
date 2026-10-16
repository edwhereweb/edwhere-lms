import { redirect } from 'next/navigation';
import { Key } from 'lucide-react';
import getSafeProfile from '@/actions/get-safe-profile';
import { db } from '@/lib/db';
import { ApiKeysClient } from './_components/api-keys-client';

export const dynamic = 'force-dynamic';

export default async function AdminApiKeysPage() {
  const profile = await getSafeProfile();
  if (!profile || profile.role !== 'ADMIN') {
    return redirect('/dashboard');
  }

  const apiKeys = await db.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      scopes: true,
      isActive: true,
      createdBy: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const serializedKeys = apiKeys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString()
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-x-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Key className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">API Secret Keys</h1>
          <p className="text-sm text-muted-foreground">
            Manage external API access keys for integrations such as WACRM and automation tools.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <ApiKeysClient initialKeys={serializedKeys} />
      </div>
    </div>
  );
}
