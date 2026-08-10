'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, Sport } from '@/lib/types';
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
    } catch (err: any) {
      const msg = err.code === 'auth/user-not-found' ? 'Пользователь не найден' :
                  err.code === 'auth/wrong-password' ? 'Неверный пароль' :
                  err.code === 'auth/email-already-in-use' ? 'Email уже зарегистрирован' :
                  err.code === 'auth/weak-password' ? 'Пароль минимум 6 символов' :
                  err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? 'Вход в Pairly' : 'Регистрация'}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
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
        
        <p className="text-center text-sm text-gray-500 mt-4">
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
  );
}