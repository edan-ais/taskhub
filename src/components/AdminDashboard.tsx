import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, Edit3, Save, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  approved: boolean;
  organization_tag: string | null;
  permission_level: string | null;
  created_at?: string;
}

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<Profile>>({});

  // Fetch all profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) console.error('Error fetching profiles:', error);
      setProfiles(data || []);
      setLoading(false);
    };
    fetchProfiles();
  }, []);

  const toggleApproval = async (profile: Profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: !profile.approved })
      .eq('id', profile.id);
    if (error) console.error('Error updating approval:', error);
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profile.id ? { ...p, approved: !profile.approved } : p
      )
    );
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from('profiles')
      .update(editedProfile)
      .eq('id', editingId);
    if (error) console.error('Error saving edits:', error);
    setProfiles((prev) =>
      prev.map((p) => (p.id === editingId ? { ...p, ...editedProfile } : p))
    );
    setEditingId(null);
    setEditedProfile({});
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-600">
        <Loader2 className="animate-spin mb-2" size={28} />
        <p>Loading user profiles...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Admin Dashboard</h1>

      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
        <table className="w-full text-sm text-slate-700">
          <thead className="bg-slate-100 border-b text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Organization Tag</th>
              <th className="px-4 py-3">Permission</th>
              <th className="px-4 py-3 text-center">Approved</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.email}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.user_id}</td>

                {/* Editable organization tag */}
                <td className="px-4 py-3">
                  {editingId === p.id ? (
                    <input
                      type="text"
                      defaultValue={p.organization_tag || ''}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({
                          ...prev,
                          organization_tag: e.target.value,
                        }))
                      }
                      className="border rounded px-2 py-1 w-32"
                    />
                  ) : (
                    <span>{p.organization_tag || '—'}</span>
                  )}
                </td>

                {/* Editable permission level */}
                <td className="px-4 py-3">
                  {editingId === p.id ? (
                    <select
                      defaultValue={p.permission_level || ''}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({
                          ...prev,
                          permission_level: e.target.value,
                        }))
                      }
                      className="border rounded px-2 py-1"
                    >
                      <option value="">None</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span>{p.permission_level || '—'}</span>
                  )}
                </td>

                {/* Approval toggle */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleApproval(p)}
                    className={`p-1 rounded-full transition ${
                      p.approved
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                    title={p.approved ? 'Approved' : 'Not Approved'}
                  >
                    {p.approved ? <Check size={18} /> : <X size={18} />}
                  </button>
                </td>

                {/* Edit/Save buttons */}
                <td className="px-4 py-3 text-right space-x-2">
                  {editingId === p.id ? (
                    <button
                      onClick={saveEdit}
                      className="text-blue-600 hover:text-blue-800"
                      title="Save changes"
                    >
                      <Save size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setEditedProfile(p);
                      }}
                      className="text-slate-600 hover:text-slate-800"
                      title="Edit profile"
                    >
                      <Edit3 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
