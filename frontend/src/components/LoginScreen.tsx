import { useState, type FormEvent } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../services/apiError';

export function LoginScreen() {
  const { isDark, toggleTheme } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not sign in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-canvas text-slate-900 dark:bg-[#0c0d0e] dark:text-[#e1e4e8] flex items-center justify-center px-4">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg bg-light-subtle dark:bg-[#1a1d22] border border-slate-200 dark:border-[#262b32] text-slate-600 dark:text-[#8b949e] hover:text-slate-900 dark:hover:text-white transition"
        title="Toggle Theme"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#1f2328] bg-light-surface dark:bg-[#14161a] shadow-sm p-8"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-white px-3 py-1.5 rounded border border-slate-300 dark:border-zinc-700 shadow-sm flex items-center">
            <span className="text-red-600 font-black tracking-tighter text-lg italic">VAG</span>
            <span className="text-slate-900 font-extrabold tracking-tight text-lg">LOGIC</span>
          </div>
        </div>

        <h1 className="text-center text-xl font-extrabold tracking-tight">Sign in</h1>
        <p className="text-center text-sm text-slate-500 dark:text-[#8b949e] mt-1 mb-6">
          Inventory and cash box
        </p>

        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b949e] mb-1.5">
          Email
        </label>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full mb-4 bg-light-surface dark:bg-[#1a1d22] border border-slate-300 dark:border-[#262b32] rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
        />

        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b949e] mb-1.5">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full mb-4 bg-light-surface dark:bg-[#1a1d22] border border-slate-300 dark:border-[#262b32] rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
        />

        {error && (
          <p className="mb-4 text-sm font-semibold text-red-600 dark:text-red-500 whitespace-pre-line">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#e52e2e] hover:bg-[#c92424] text-white py-2.5 rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
