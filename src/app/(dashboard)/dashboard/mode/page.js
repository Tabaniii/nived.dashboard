import { redirect } from 'next/navigation';

export const instant = false;

export default function CardModePage() {
  redirect('/dashboard/review-link');
}
