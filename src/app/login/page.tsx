'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, Sport } from '@/lib/types';
import { sportNames } from '@/lib/theme';

export function LoginPage() {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    sport: 'padel' as Sport,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(form.email, form.password);
        showToast('Вход выполнен', 'success');
      } else {
        if (!form.displayName) {
          showToast('Введите имя', 'error');
          return;
        }
        await register(form.email, form.password, form.displayName, form.sport);
        showToast('Регистрация успешна', 'success');
      }
    } catch (error: any) {
      const msg = error.code === 'auth/user-not-found' ? 'Пользователь не найден' :
                  error.code === 'auth/wrong-password' ? 'Неверный пароль' :
                  error.code === 'auth/email-already-in-use' ? 'Email уже зарегистрирован' :
                  error.code === 'auth/weak-password' ? 'Пароль минимум 6 символов' :
                  error.message;
      showToast(msg, 'error');
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

export default LoginPage;