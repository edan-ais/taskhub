import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      if (error) setMessage(error.message);
      else {
        // create matching profile
        await supabase.from('profiles').insert({ user_id: data.user?.id });
        setMessage('Signup complete — check your email to confirm.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-pink-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </h2>
        <input
          className="border w-full mb-3 p-2 rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border w-full mb-4 p-2 rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="bg-pink-500 hover:bg-pink-600 text-white font-semibold w-full py-2 rounded"
        >
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
        <p className="text-center text-sm mt-3">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button type="button" className="text-pink-600" onClick={() => setMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button type="button" className="text-pink-600" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>
        {message && <p className="mt-3 text-center text-sm text-gray-700">{message}</p>}
      </form>
    </div>
  );
}
