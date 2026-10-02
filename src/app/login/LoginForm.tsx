'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { t } from '@/lib/i18n';

/** The password form, in the same card layout and design tokens as the start screen. */
export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'wrong' | 'failed'>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === 'checking' || password === '') return;
    setState('checking');
    try {
      const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (response.ok) {
        // The session cookie is set; the gate now lets the start page through.
        router.replace('/');
        return;
      }
      setState(response.status === 401 ? 'wrong' : 'failed');
    } catch {
      setState('failed');
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-(--cs-canvas) text-(--cs-text) p-6 overflow-auto">
      <form onSubmit={submit} className="w-full max-w-[420px] bg-(--cs-card) border border-(--cs-border) rounded-[18px] px-[30px] pt-8 pb-[30px] shadow-2xl">
        <div className="text-[10px] tracking-[0.16em] uppercase text-(--cs-eyebrow)">{t('start.eyebrow')}</div>
        <h1 className="text-[28px] leading-tight mt-5">{t('login.title')}</h1>
        <p className="text-[13px] text-(--cs-text-soft) mt-5">{t('login.subtitle')}</p>

        <label htmlFor="password" className="block text-[13px] font-medium mt-9 mb-3">
          {t('login.password')}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (state !== 'checking') setState('idle');
          }}
          aria-invalid={state === 'wrong'}
          aria-describedby="login-message"
          className={`w-full h-[44px] px-3.5 rounded-lg border bg-(--cs-input) text-sm outline-none focus:border-(--cs-accent) ${state === 'wrong' ? 'border-(--cs-danger)' : 'border-(--cs-border)'}`}
        />
        <p id="login-message" role="alert" className="min-h-[18px] text-[12px] text-(--cs-danger) mt-2">
          {state === 'wrong' ? t('login.wrong') : state === 'failed' ? t('login.failed') : ''}
        </p>

        <button
          type="submit"
          disabled={state === 'checking' || password === ''}
          className="mt-4 w-full h-11 rounded-full bg-(--cs-accent) hover:bg-(--cs-accent-hover) disabled:opacity-50 disabled:hover:bg-(--cs-accent) text-(--cs-on-accent) font-medium text-base"
        >
          {state === 'checking' ? t('login.checking') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}
