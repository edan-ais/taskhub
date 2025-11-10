import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const [orgTag, setOrgTag] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('organization_tag').eq('user_id', user.id).single();
      setOrgTag(data?.organization_tag || '');
    };
    loadProfile();
  }, []);

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ organization_tag: orgTag, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    setMessage(error ? error.message : 'Saved!');
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white shadow rounded-xl">
      <h2 className="text-xl font-bold mb-3">Profile</h2>
      <label className="block text-sm font-medium">Organization Tag</label>
      <input
        value={orgTag}
        onChange={(e) => setOrgTag(e.target.value)}
        className="border w-full p-2 rounded mb-4"
      />
      <button
        onClick={save}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
      >
        Save
      </button>
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
