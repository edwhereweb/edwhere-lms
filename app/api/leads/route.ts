import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
  source: z.string().default('MANUAL_ENTRY')
});

export async function GET() {
  try {
    const authorized = await isMarketer();
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const leads = await db.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('[LEADS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authorized = await isMarketer();
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const lead = await db.lead.create({
      data: {
        ...parsed.data,
        status: 'NEW_LEAD'
      }
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('[LEADS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
