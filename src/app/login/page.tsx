'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Sport } from '@/lib/types';
import { sportNames } from '@/lib/theme';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    sport: 'padel' as Sport,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (isLogin) {
        await login(form.email, form.password);
        setSuccess('Вход выполнен');
        router.push('/');
        router.refresh();
      } else {
        if (!form.displayName) {
          setError('Введите имя');
          return;
        }
        await register(form.email, form.password, form.displayName, form.sport);
        setSuccess('Регистрация успешна');
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const msg = e.code === 'auth/user-not-found' ? 'Пользователь не найден' :
                  e.code === 'auth/wrong-password' ? 'Неверный пароль' :
                  e.code === 'auth/email-already-in-use' ? 'Email уже зарегистрирован' :
                  e.code === 'auth/weak-password' ? 'Пароль минимум 6 символов' :
                  e.message || 'Неизвестная ошибка';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Брендовое свечение */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full opacity-20 blur-3xl brand-gradient" aria-hidden="true" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <h1 className="brand-gradient-text text-5xl font-extrabold tracking-tight">Pairly</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">Находи игры, организуй матчи, играй вместе</p>
        </div>

        <div className="card p-8 relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 brand-gradient" aria-hidden="true" />

          <div className="flex gap-2 p-1 rounded-xl bg-[var(--color-surface-secondary)] mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isLogin ? 'brand-gradient text-[var(--color-text-on-brand)]' : 'text-[var(--color-text-secondary)]'}`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${!isLogin ? 'brand-gradient text-[var(--color-text-on-brand)]' : 'text-[var(--color-text-secondary)]'}`}
            >
              Регистрация
            </button>
          </div>

          <h2 className="text-xl font-bold text-center mb-5">
            {isLogin ? 'С возвращением!' : 'Создайте аккаунт'}
          </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-[var(--color-red)]/15 text-[var(--color-red-light)] rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-[var(--color-green)]/15 text-[var(--color-green-light)] rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Имя"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              className="input-field"
              required={!isLogin}
              autoComplete="name"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="input-field"
            required
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Пароль (минимум 6 символов)"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="input-field"
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {!isLogin && (
            <select
              value={form.sport}
              onChange={e => setForm(f => ({ ...f, sport: e.target.value as Sport }))}
              className="input-field"
            >
              {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(s => (
                <option key={s} value={s}>{sportNames[s]}</option>
              ))}
            </select>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Подождите...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-tertiary)] mt-4">
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[var(--color-brand)] font-medium hover:underline"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
        </div>
      </div>
    </div>
  );
}