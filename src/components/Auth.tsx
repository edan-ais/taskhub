import { useState } from 'react';
import { supabase } from '../lib/supabase';

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

      // Create unapproved profile
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        requested_org: requestedOrg,
        approved: false,
      });

      setMessage('Signup complete. Waiting for admin approval.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4 text-center text-pink-600">
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </h2>

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
          className="bg-pink-500 hover:bg-pink-600 text-white w-full py-2 rounded font-semibold"
        >
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>

        <p className="text-sm text-center mt-3">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button type="button" className="text-pink-600" onClick={() => setMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="text-pink-600" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>

        {message && <p className="text-gray-600 text-sm mt-3 text-center">{message}</p>}
      </form>
    </div>
  );
}
