import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2 } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestedOrg, setRequestedOrg] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMessage(error ? error.message : 'Signed in!');
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) return setMessage(error.message);
      if (!data.user) return;

      await supabase.from('profiles').insert({
        user_id: data.user.id,
        requested_org: requestedOrg,
        approved: false,
      });

      setMessage('Signup complete — waiting for admin approval.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-96">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <CheckCircle2 size={48} className="text-blue-600 mb-2" />
          <h1 className="text-3xl font-bold text-slate-800">TaskHUB</h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'signin' ? 'Sign in to your workspace' : 'Create your TaskHUB account'}
          </p>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border w-full p-2 mb-3 rounded"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border w-full p-2 mb-3 rounded"
          required
        />

        {mode === 'signup' && (
          <input
            type="text"
            value={requestedOrg}
            onChange={(e) => setRequestedOrg(e.target.value)}
            placeholder="Organization ID (optional)"
            className="border w-full p-2 mb-4 rounded"
          />
        )}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded font-semibold transition-all"
        >
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>

        <p className="text-sm text-center mt-3">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                className="text-blue-600"
                onClick={() => setMode('signup')}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="text-blue-600"
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {message && (
          <p className="text-gray-600 text-sm mt-3 text-center">{message}</p>
        )}
      </form>
    </div>
  );
}
