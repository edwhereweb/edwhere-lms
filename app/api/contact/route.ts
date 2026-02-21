import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  message: z.string().min(5).max(5000)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, phone, email, message } = parsed.data;

    const lead = await db.lead.create({
      data: {
        name,
        phone,
        email,
        message,
        source: 'GENERAL_WEBSITE_ENQUIRY',
        status: 'NEW_LEAD'
      }
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('[CONTACT_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
