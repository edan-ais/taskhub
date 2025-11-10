import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<any[]>([]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setProfiles(data || []);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const updateProfile = async (id: string, updates: any) => {
    await supabase.from('profiles').update(updates).eq('id', id);
    fetchProfiles();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin Control Panel</h2>
      {profiles.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between border p-3 mb-2 rounded-lg"
        >
          <div>
            <p className="font-semibold">{p.full_name || p.user_id}</p>
            <p className="text-sm text-slate-600">{p.requested_org || '—'}</p>
            <p className="text-sm text-slate-600">
              Tag: {p.organization_tag || 'Unassigned'}
            </p>
          </div>
          <div className="flex gap-2">
            {!p.approved && (
              <button
                onClick={() => updateProfile(p.id, { approved: true })}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                Approve
              </button>
            )}
            <button
              onClick={() =>
                updateProfile(p.id, { organization_tag: 'WW529400', approved: true })
              }
              className="bg-blue-500 text-white px-3 py-1 rounded"
            >
              Set Org Tag
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
