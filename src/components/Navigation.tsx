import {
  Search,
  EyeOff,
  Eye,
  CheckCircle2,
  RefreshCw,
  UserCircle2,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function Navigation() {
  const { searchQuery, setSearchQuery, hideCompleted, setHideCompleted } = useAppStore();
  const { fetchTasks, fetchDivisions, fetchTags, fetchIdeas, fetchPeople, fetchEmails } = useData();
  const { user, signOut } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [orgTag, setOrgTag] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* --------------------------- HANDLE DATA REFRESH -------------------------- */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchTasks(),
      fetchDivisions(),
      fetchTags(),
      fetchIdeas(),
      fetchPeople(),
      fetchEmails(),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  /* ------------------------------ LOAD PROFILE ------------------------------ */
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('organization_tag')
        .eq('user_id', user.id)
        .single();
      setOrgTag(data?.organization_tag || '');
    };
    loadProfile();
  }, [user]);

  /* -------------------------- CLOSE DROPDOWN ON CLICK ----------------------- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-200 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        {/* DESKTOP ROW */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <CheckCircle2 size={28} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">TaskHUB</h1>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 h-10 rounded-lg border-2 bg-white text-slate-700 border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh all data"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden md:inline text-sm font-medium">Refresh</span>
            </button>

            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`flex items-center gap-2 px-4 h-10 rounded-lg border-2 transition-all ${
                hideCompleted
                  ? 'bg-slate-600 text-white border-slate-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title={hideCompleted ? 'Show Completed Tasks' : 'Hide Completed Tasks'}
            >
              {hideCompleted ? <Eye size={18} /> : <EyeOff size={18} />}
              <span className="hidden md:inline text-sm font-medium">
                {hideCompleted ? 'Show' : 'Hide'} Completed
              </span>
            </button>

            {/* Search (Desktop) */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-10 rounded-lg bg-white border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-64"
              />
            </div>

            {/* Profile Button */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 transition-all"
                  title="Profile"
                >
                  <UserCircle2 size={20} className="text-slate-700" />
                  <span className="hidden md:inline text-sm font-medium text-slate-700">
                    Profile
                  </span>
                </button>

                {showProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
                    <h3 className="font-semibold text-slate-800 text-sm mb-1">Signed in as</h3>
                    <p className="text-slate-600 text-sm mb-2 truncate">{user.email}</p>

                    <div className="mb-4">
                      <p className="text-xs font-medium text-slate-500">Organization Tag</p>
                      <p className="text-sm font-semibold text-blue-600">{orgTag || '—'}</p>
                    </div>

                    <button
                      onClick={async () => {
                        setShowProfile(false);
                        await signOut();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                    >
                      <LogOut size={16} />
                      <span className="text-sm font-medium">Log out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE SEARCH ROW */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-10 rounded-lg bg-white border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
