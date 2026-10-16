import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';
import { validateApiKey } from '@/lib/api-key';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * GET /api/v1/contacts/enrollments
 *
 * Secure external API for WACRM to look up a contact's enrolled courses and
 * webinar registrations.
 *
 * Authentication:
 *   - 'x-api-key: <key>' OR
 *   - 'Authorization: Bearer <key>'
 * Validated against stored SHA-256 hash. Requires 'contacts:read' scope.
 *
 * Query params:
 *   - ?phone=<contact_phone> (digits with or without leading '+')
 *   - ?email=<contact_email>
 */
export async function GET(req: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const rawKey = req.headers.get('x-api-key')?.trim() || bearerKey;

    if (!rawKey) return apiError('Missing x-api-key or Authorization Bearer header', 401);

    // Find all active keys and verify against each
    const activeKeys = await db.apiKey.findMany({
      where: { isActive: true },
      select: { id: true, keyHash: true, scopes: true }
    });

    const matchedKey = activeKeys.find((k) => validateApiKey(rawKey, k.keyHash));
    if (!matchedKey) return apiError('Invalid or revoked API key', 401);

    const scopes = matchedKey.scopes.split(',').map((s) => s.trim());
    if (!scopes.includes('contacts:read') && !scopes.includes('*')) {
      return apiError('Insufficient scope — contacts:read required', 403);
    }

    // Update lastUsedAt non-blocking
    void db.apiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date() }
    });

    // ── Query params ──────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone')?.trim();
    const email = searchParams.get('email')?.trim();

    if (!phone && !email) {
      return apiError('Provide at least one of: phone, email', 400);
    }

    // ── Resolve Clerk user & Contact Info ──────────────────────────────────────
    let clerkUserId: string | null = null;
    let contactName = '';
    let contactPhone = phone?.replace(/^\+/, '') ?? '';
    let contactEmail = email ?? '';

    try {
      const client = await clerkClient();

      // 1. Prefer email lookup
      if (email) {
        const results = await client.users.getUserList({ emailAddress: [email], limit: 1 });
        if (results.data.length > 0) {
          const user = results.data[0];
          clerkUserId = user.id;
          contactName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
          contactEmail = user.emailAddresses[0]?.emailAddress ?? email;
          const userPhone = user.phoneNumbers[0]?.phoneNumber?.replace(/^\+/, '');
          if (userPhone) contactPhone = userPhone;
        }
      }

      // 2. Fall back to phone lookup
      if (!clerkUserId && phone) {
        const normalised = phone.startsWith('+') ? phone : `+${phone}`;
        const results = await client.users.getUserList({
          phoneNumber: [normalised],
          limit: 1
        });
        if (results.data.length > 0) {
          const user = results.data[0];
          clerkUserId = user.id;
          contactName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
          contactEmail = user.emailAddresses[0]?.emailAddress ?? contactEmail;
          contactPhone = phone.replace(/^\+/, '');
        }
      }
    } catch {
      // Clerk lookup errors should not break response — fall through to DB lookup
    }

    // 3. Fall back to Profile table lookup if Clerk lookup didn't yield clerkUserId
    if (!clerkUserId && email) {
      const profile = await db.profile.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { userId: true, name: true, email: true }
      });
      if (profile) {
        clerkUserId = profile.userId;
        if (!contactName) contactName = profile.name;
        if (!contactEmail) contactEmail = profile.email;
      }
    }

    // ── Webinar registrations query ──────────────────────────────────────────
    // Attendees can register without a Clerk user account, so we query registrations
    // by email and/or phone directly.
    const webinarConditions = [];
    if (email || contactEmail) {
      const queryEmail = email || contactEmail;
      webinarConditions.push({ email: { equals: queryEmail, mode: 'insensitive' as const } });
    }
    if (phone) {
      const rawDigits = phone.replace(/\D/g, '');
      const last10 = rawDigits.slice(-10);
      webinarConditions.push({ phone }, { phone: rawDigits }, { phone: `+${rawDigits}` });
      if (last10 && last10 !== rawDigits) {
        webinarConditions.push({ phone: { endsWith: last10 } });
      }
    }

    const [purchases, registrations] = await Promise.all([
      // Courses via purchases (requires clerkUserId)
      clerkUserId
        ? db.purchase.findMany({
            where: { userId: clerkUserId },
            include: {
              course: {
                select: { id: true, title: true, whatsappGroupUrl: true, isPublished: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          })
        : Promise.resolve([]),

      // Webinars via registration records
      webinarConditions.length > 0
        ? db.webinarRegistration.findMany({
            where: { OR: webinarConditions },
            include: {
              webinar: {
                select: {
                  id: true,
                  title: true,
                  scheduledAt: true,
                  isPublished: true,
                  whatsappGroupUrl: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          })
        : Promise.resolve([])
    ]);

    // Populate contact name/email/phone from webinar registration if not found from Clerk/Profile
    if (!contactName && registrations.length > 0) {
      contactName = registrations[0].name;
      if (!contactEmail) contactEmail = registrations[0].email;
      if (!contactPhone) contactPhone = registrations[0].phone;
    }

    const coursesPayload = purchases.map((p) => ({
      id: p.course.id,
      title: p.course.title,
      enrolledAt: p.createdAt.toISOString(),
      status: p.course.isPublished ? 'active' : 'inactive',
      whatsappGroupUrl: p.course.whatsappGroupUrl ?? null
    }));

    // Deduplicate webinars by webinar ID in case of multiple registration rows
    const seenWebinars = new Set<string>();
    const webinarsPayload = registrations
      .filter((r) => {
        if (!r.webinar || seenWebinars.has(r.webinar.id)) return false;
        seenWebinars.add(r.webinar.id);
        return true;
      })
      .map((r) => ({
        id: r.webinar.id,
        title: r.webinar.title,
        eventDate: r.webinar.scheduledAt.toISOString(),
        status: r.webinar.isPublished ? 'active' : 'inactive',
        whatsappGroupUrl: r.webinar.whatsappGroupUrl ?? null
      }));

    return NextResponse.json(
      {
        contact: {
          name: contactName,
          phone: contactPhone,
          email: contactEmail
        },
        courses: coursesPayload,
        webinars: webinarsPayload
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'private, max-age=60' }
      }
    );
  } catch (error) {
    return handleApiError('V1_CONTACTS_ENROLLMENTS', error);
  }
}
