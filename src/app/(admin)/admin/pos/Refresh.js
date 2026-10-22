'use client';
import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
export default function Refresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => { const timer = setInterval(() => { if (document.visibilityState === 'visible') startTransition(()=>router.refresh()); }, 60000); return ()=>clearInterval(timer); }, [router]);
  return <button className="rounded-lg border px-3 py-2 text-sm" disabled={pending} onClick={()=>startTransition(()=>router.refresh())}>{pending ? 'Refreshing…' : 'Refresh · auto every 60s'}</button>;
}
