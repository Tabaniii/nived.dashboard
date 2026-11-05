import { redirect } from 'next/navigation';

export const instant = false;

export default async function PromotionPage({ searchParams }) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const key of ['card', 'staff', 'meja']) {
    if (typeof query[key] === 'string') params.set(key, query[key]);
  }
  const suffix = params.size ? `?${params}` : '';
  redirect(`/dashboard/staff${suffix}`);
}
