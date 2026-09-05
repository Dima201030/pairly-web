'use client';

import { useState } from 'react';
import Image from 'next/image';
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
      const msg = e.code === 'auth/user-not-found' ? 'Пользователь не найден (проверьте email)' :
                  e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential' ? 'Неверный пароль' :
                  e.code === 'auth/invalid-email' ? 'Некорректный email' :
                  e.code === 'auth/too-many-requests' ? 'Слишком много попыток, подождите 1 минуту' :
                  e.code === 'auth/network-request-failed' ? 'Нет сети — проверьте подключение' :
                  e.code === 'auth/email-already-in-use' ? 'Email уже зарегистрирован' :
                  e.code === 'auth/weak-password' ? 'Пароль минимум 6 символов' :
                  (e.message || 'Неизвестная ошибка') + (e.code ? ` (${e.code})` : '');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pairly-bg">
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <Image
            src="/logo-white.png"
            alt="Pairly"
            width={1024}
            height={1024}
            className="h-16 w-auto mx-auto mb-4"
          />
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Находи игры, организуй матчи, играй вместе
          </p>
        </div>

        <div className="card p-6">
          <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: 'var(--color-surface)' }}>
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                isLogin
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                !isLogin
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              Регистрация
            </button>
          </div>

          <h2 className="text-xl font-bold text-center mb-5" style={{ color: 'var(--color-text-primary)' }}>
            {isLogin ? 'С возвращением!' : 'Создайте аккаунт'}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--color-negative-subtle)', color: 'var(--color-negative)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--color-positive-subtle)', color: 'var(--color-positive)' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className="label" htmlFor="displayName">Имя</label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="Ваше имя"
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  className="input-field"
                  required={!isLogin}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                placeholder="Минимум 6 символов"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field"
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="label" htmlFor="sport">Вид спорта</label>
                <select
                  id="sport"
                  value={form.sport}
                  onChange={e => setForm(f => ({ ...f, sport: e.target.value as Sport }))}
                  className="input-field"
                >
                  {(['padel', 'tennis', 'badminton', 'squash', 'football', 'running'] as Sport[]).map(s => (
                    <option key={s} value={s}>{sportNames[s]}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full py-3 mt-2"
            >
              {loading ? 'Подождите...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--color-text-tertiary)' }}>
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold ml-1 hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              {isLogin ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
