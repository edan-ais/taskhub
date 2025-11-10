import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, Shield, User } from 'lucide-react';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  /* ----------------------------- LOAD PROFILE ----------------------------- */
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Try fetching by user_id first, fallback to email
      let { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profileData && user.email) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        profileData = fallback;
      }

      if (error) console.warn('Error fetching profile:', error.message);

      setProfile(profileData);
      setIsAdmin(profileData?.organization_tag === 'WW529400');
      setLoading(false);
    };

    loadProfile();
  }, []);

  /* --------------------------- LOAD ALL PROFILES --------------------------- */
  useEffect(() => {
    if (!isAdmin) return;
    const loadAllProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, organization_tag, approved, permission_level')
        .order('email', { ascending: true });

      if (error) console.error('Error loading all profiles:', error);
      else setAllProfiles(data || []);
    };
    loadAllProfiles();
  }, [isAdmin]);

  /* ----------------------------- SAVE OWN PROFILE ----------------------------- */
  const saveOwnProfile = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        organization_tag: profile.organization_tag,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    setMessage(error ? error.message : '✅ Profile saved successfully.');
    setEditing(false);
  };

  /* -------------------------- UPDATE USER PERMISSIONS -------------------------- */
  const updateUserPermissions = async (userId: string, updates: any) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      setMessage('❌ ' + error.message);
    } else {
      setMessage('✅ User updated!');
      // Refresh list to reflect changes
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, email, organization_tag, approved, permission_level')
        .order('email', { ascending: true });
      setAllProfiles(data || []);
    }
  };

  /* ------------------------------ LOADING STATE ------------------------------ */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-600">
        <Loader2 className="animate-spin mb-2" size={28} />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-10 text-slate-600">
        <p>No profile found.</p>
      </div>
    );
  }

  /* ------------------------------ MAIN PROFILE ------------------------------ */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="text-blue-600" size={28} />
        <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-2">
        <p>
          <span className="font-medium text-slate-700">Email:</span>{' '}
          {profile.email || '—'}
        </p>
        <p>
          <span className="font-medium text-slate-700">Organization ID:</span>{' '}
          {editing ? (
            <input
              className="border border-slate-300 rounded px-2 py-1 text-sm"
              value={profile.organization_tag || ''}
              onChange={(e) =>
                setProfile({ ...profile, organization_tag: e.target.value })
              }
            />
          ) : (
            <span className="font-semibold text-blue-600">
              {profile.organization_tag || '—'}
            </span>
          )}
        </p>
        <p>
          <span className="font-medium text-slate-700">Permission Level:</span>{' '}
          <span className="capitalize">{profile.permission_level || 'member'}</span>
        </p>
        <p>
          <span className="font-medium text-slate-700">Approved:</span>{' '}
          {profile.approved ? (
            <span className="text-green-600 font-medium">✅ Approved</span>
          ) : (
            <span className="text-red-500 font-medium">❌ Pending</span>
          )}
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        {!isAdmin && (
          <>
            {editing ? (
              <button
                onClick={saveOwnProfile}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Edit
              </button>
            )}
          </>
        )}
      </div>

      {message && (
        <p className="mt-3 text-sm text-slate-600 bg-slate-50 border rounded p-2">
          {message}
        </p>
      )}

      {/* ----------------------------- ADMIN PANEL ----------------------------- */}
      {isAdmin && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="text-purple-600" size={22} />
            <h3 className="text-lg font-semibold text-slate-800">
              Admin: Manage Users
            </h3>
          </div>

          {allProfiles.length === 0 ? (
            <p className="text-slate-500 text-sm">No users found.</p>
          ) : (
            <div className="border rounded-lg divide-y">
              {allProfiles.map((p) => (
                <div
                  key={p.user_id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-800 flex items-center gap-1">
                      <User size={16} /> {p.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      Org: {p.organization_tag || '—'} |{' '}
                      {p.approved ? '✅ Approved' : '❌ Pending'} |{' '}
                      {p.permission_level}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Org ID"
                      defaultValue={p.organization_tag || ''}
                      onChange={(e) => (p.organization_tag = e.target.value.trim())}
                      className="border border-slate-300 rounded px-2 py-1 text-xs"
                    />
                    <select
                      defaultValue={p.permission_level || 'member'}
                      onChange={(e) => (p.permission_level = e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() =>
                        updateUserPermissions(p.user_id, {
                          organization_tag: p.organization_tag,
                          permission_level: p.permission_level,
                          approved: true,
                        })
                      }
                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
