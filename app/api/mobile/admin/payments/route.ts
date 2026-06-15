import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { isMarketer } from '@/lib/marketer';
import { db } from '@/lib/db';
import { mobileCreatePaymentEntrySchema } from '@/lib/validations';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await isMarketer();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const entries = await db.leadPaymentEntry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { name: true } }
      }
    });

    return mobileSuccess(entries);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PAYMENTS_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await isMarketer();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(mobileCreatePaymentEntrySchema, body);
    if (!result.success) return result.response;

    const { leadId, amount, mode, label, note } = result.data;

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { paymentEntries: true }
    });
    if (!lead) return mobileError('NOT_FOUND', 'Lead not found', 404);
    if (lead.closureStatus !== 'WON') {
      return mobileError('VALIDATION', 'Can only add payments to closed-won leads', 400);
    }

    if (lead.agreedAmount !== null) {
      const existingTotal = lead.paymentEntries
        .filter((e) => e.status !== 'WAIVED' && e.status !== 'DELETION_REQUESTED')
        .reduce((s, e) => s + e.amount, 0);
      if (existingTotal + amount > lead.agreedAmount) {
        const remaining = lead.agreedAmount - existingTotal;
        return mobileError(
          'VALIDATION',
          `Entry amount exceeds the remaining balance. Maximum allowed: ₹${remaining.toLocaleString('en-IN')}`,
          400
        );
      }
    }

    const entry = await db.leadPaymentEntry.create({
      data: {
        leadId,
        label: label || `Payment - ${new Date().toLocaleDateString('en-IN')}`,
        amount,
        mode,
        note,
        recordedBy: userId
      }
    });

    return mobileCreated(entry);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PAYMENTS_CREATE', error);
  }
}
