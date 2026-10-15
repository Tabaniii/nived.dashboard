import { NextResponse } from 'next/server';
import { isValidUUID, isValidRating } from '@/lib/validation';
import { recordStarTelemetry, getCardById } from '@/lib/db';
import { parseDeviceOS } from '@/lib/device';
import { hashIp } from '@/lib/debounce';
import { getClientMeta } from '@/lib/client-meta';
import { sanitizeStaffCode, sanitizeTableCode } from '@/lib/attribution';

/**
 * POST /api/telemetry/star
 * Records client-side star selection telemetry (1-5 stars) into tap_logs.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const { card_id, selected_stars, staff_code, table_code } = body || {};

  // 1. Validate card_id
  if (!card_id || !isValidUUID(card_id)) {
    return NextResponse.json(
      { error: 'Validation error', message: 'Valid card_id (UUID) is required' },
      { status: 400 }
    );
  }

  // 2. Validate selected_stars (must be integer 1 to 5)
  if (!isValidRating(selected_stars, 1, 5)) {
    return NextResponse.json(
      {
        error: 'Validation error',
        message: 'selected_stars must be an integer between 1 and 5',
      },
      { status: 400 }
    );
  }

  // 3. Verify card exists
  const card = await getCardById(card_id);
  if (!card) {
    return NextResponse.json(
      { error: 'Card not found', message: 'The referenced card does not exist' },
      { status: 404 }
    );
  }

  const { clientIp, userAgent } = getClientMeta(request.headers);
  const ipHash = hashIp(clientIp);
  const deviceOs = parseDeviceOS(userAgent);

  try {
    const result = await recordStarTelemetry({
      card_id,
      selected_stars: Number(selected_stars),
      ip_hash: ipHash,
      device_os: deviceOs,
      user_agent: userAgent,
      staff_code: sanitizeStaffCode(staff_code),
      table_code: sanitizeTableCode(table_code),
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to record star telemetry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[api/telemetry/star] Error:', error);
    return NextResponse.json(
      { error: 'Database error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
