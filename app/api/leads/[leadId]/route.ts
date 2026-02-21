import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { z } from 'zod';

const VALID_STATUSES = [
  'NEW_LEAD',
  'DECISION_PENDING',
  'RNR1',
  'RNR2',
  'PAYMENT_PENDING',
  'NOT_INTERESTED',
  'OFFLINE_INTERESTED',
  'FUTURE_OPTIONS'
] as const;

const updateSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  notes: z.string().max(10000).optional()
});

export async function PATCH(req: Request, { params }: { params: { leadId: string } }) {
  try {
    const authorized = await isMarketer();
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const lead = await db.lead.update({
      where: { id: params.leadId },
      data: parsed.data
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error('[LEAD_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
