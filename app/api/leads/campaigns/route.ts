import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { apiError, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200)
});

export async function GET() {
  try {
    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const campaigns = await db.leadCampaign.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    return handleApiError('LEAD_CAMPAIGNS_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const body = await req.json();
    const result = createCampaignSchema.safeParse(body);
    if (!result.success) {
      return apiError('Invalid request payload', 400);
    }

    const { name } = result.data;

    let campaign = await db.leadCampaign.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (!campaign) {
      campaign = await db.leadCampaign.create({
        data: { name }
      });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return handleApiError('LEAD_CAMPAIGNS_POST', error);
  }
}
