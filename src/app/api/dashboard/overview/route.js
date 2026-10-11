import { NextResponse } from 'next/server';
import {
  getClientContext,
  getClientDashboardData,
} from '@/app/(dashboard)/dashboard/queries';

export const instant = false;

export async function GET() {
  try {
    const ctx = await getClientContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.merchant?.status === 'suspended') {
      return NextResponse.json({ error: 'Merchant suspended' }, { status: 403 });
    }

    const data = await getClientDashboardData(ctx.profile.merchant_id);
    return NextResponse.json({
      merchant: ctx.merchant,
      profile: {
        email: ctx.profile.email,
        full_name: ctx.profile.full_name,
        role: ctx.profile.role,
      },
      ...data,
    });
  } catch (error) {
    console.error('[api/dashboard/overview]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
