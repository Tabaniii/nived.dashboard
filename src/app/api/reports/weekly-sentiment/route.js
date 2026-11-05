import { isAuthorizedCronRequest } from '@/lib/insights/cron-auth';
import { generateAndStoreSummary } from '@/lib/insights/store';
import { isValidUUID } from '@/lib/validation';

export const maxDuration = 60;

export async function POST(request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const storeId = body?.store_id;
  if (!isValidUUID(storeId)) {
    return Response.json({ error: 'A valid store_id is required' }, { status: 400 });
  }

  try {
    const report = await generateAndStoreSummary(storeId.trim());
    if (!report) return Response.json({ error: 'Store not found' }, { status: 404 });

    return Response.json({
      summary: report.summary,
      source: report.source,
      feedback_count: report.feedback_count,
    });
  } catch (error) {
    console.error('[reports/weekly-sentiment] Report generation failed:', error?.code || error?.name);
    return Response.json({ error: 'Could not generate weekly sentiment' }, { status: 500 });
  }
}
