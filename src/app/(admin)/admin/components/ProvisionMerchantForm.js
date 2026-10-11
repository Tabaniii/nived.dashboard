'use client';

import { useState, useTransition } from 'react';
import { UserPlus, Copy, Check, AlertTriangle, Building, User, Mail, Lock, Phone, Loader2 } from 'lucide-react';
import { provisionMerchantAction } from '../actions';

const fieldClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all';

export default function ProvisionMerchantForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);

    startTransition(async () => {
      const result = await provisionMerchantAction(formData);
      if (result?.error) {
        setError(result.error);
        setCredentials(null);
        return;
      }
      setCredentials(result.credentials);
      form.reset();
    });
  }

  const handleCopy = () => {
    if (!credentials) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `Kredensial Login Merchant Nived:\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nLogin Portal: ${origin}/`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <UserPlus className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Tambah Merchant & Akun Client Baru</h2>
          <p className="text-xs text-zinc-400">
            Daftarkan profil bisnis baru dan buat kredensial login aman untuk diserahkan ke klien.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="business_name" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Building className="size-3.5 text-zinc-500" />
            <span>Nama Bisnis / Toko</span>
          </label>
          <input
            id="business_name"
            name="business_name"
            required
            className={fieldClass}
            placeholder="Contoh: Kopi Senja Mandiri"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="owner_name" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <User className="size-3.5 text-zinc-500" />
            <span>Nama Pemilik</span>
          </label>
          <input
            id="owner_name"
            name="owner_name"
            required
            className={fieldClass}
            placeholder="Contoh: Budi Santoso"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Phone className="size-3.5 text-zinc-500" />
            <span>No. Kontak / WA Pemilik</span>
          </label>
          <input
            id="contact"
            name="contact"
            className={fieldClass}
            placeholder="6281234567890"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Mail className="size-3.5 text-zinc-500" />
            <span>Email Login Client</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={fieldClass}
            placeholder="owner@kopisenja.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Lock className="size-3.5 text-zinc-500" />
            <span>Password (Opsional)</span>
          </label>
          <input
            id="password"
            name="password"
            className={fieldClass}
            placeholder="Kosongkan untuk auto-generate (16 karakter)"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="status" className="block text-xs font-medium text-zinc-300">
            Status Berlangganan
          </label>
          <select id="status" name="status" defaultValue="trial" className={fieldClass}>
            <option value="trial">Trial (Uji Coba 14 Hari)</option>
            <option value="active">Active (Langganan Aktif)</option>
            <option value="suspended">Suspended (Ditangguhkan)</option>
          </select>
        </div>

        <div className="sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-sm active:scale-[0.99]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Membuat Akun Merchant...</span>
              </>
            ) : (
              <span>Buat Merchant & Kredensial</span>
            )}
          </button>
        </div>
      </form>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200"
        >
          {error}
        </div>
      ) : null}

      {/* One-Time Credentials Display */}
      {credentials ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Kredensial Login Berhasil Dibuat
              </p>
              <p className="text-xs text-zinc-300 mt-0.5">
                Salin dan serahkan kredensial ini kepada merchant. Password tidak akan ditampilkan kembali.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Email:</span>
              <span className="text-zinc-100 font-semibold">{credentials.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Password:</span>
              <span className="text-emerald-400 font-semibold">{credentials.password}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Login URL:</span>
              <span className="text-zinc-400">{typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}</span>
            </div>
          </div>

          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 cursor-pointer"
            >
              {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              <span>{copied ? 'Kredensial Tersalin!' : 'Salin Kredensial'}</span>
            </button>
            <span className="text-[11px] text-zinc-500">
              Format teks siap kirim ke WhatsApp/Email klien
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
