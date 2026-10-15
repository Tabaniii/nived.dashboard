'use client';

import { useState, useActionState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { loginAction } from './actions';

const initialState = { error: null };

export default function LoginForm({ bannerError }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => loginAction(formData),
    initialState
  );

  const error = state?.error || bannerError;

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-200"
        >
          <AlertCircle className="size-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="login-email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Email Akun
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
            <Mail className="size-4" />
          </div>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            required
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 py-2.5 pl-9 pr-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
            placeholder="nama@bisnis.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
            <Lock className="size-4" />
          </div>
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 py-2.5 pl-9 pr-10 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 focus:outline-none"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-xs active:scale-[0.99]"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Memverifikasi...</span>
          </>
        ) : (
          <span>Masuk ke Portal</span>
        )}
      </button>

      <p className="pt-2 text-center text-[11px] text-zinc-500">
        Kredensial diberikan oleh tim Nived. Tidak ada registrasi mandiri.
      </p>
    </form>
  );
}
