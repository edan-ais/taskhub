import { useAuth } from './hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import { Navigation } from './components/Navigation';
import { BottomNavigation } from './components/BottomNavigation';
import AdminDashboard from './components/AdminDashboard';
import { useAppStore } from './lib/store';
import { useData } from './hooks/useData';
import { LoadingSpinner } from './components/LoadingSpinner';
import {
  HomeTab,
  PeopleTab,
  TagsTab,
  CalendarTab,
  IdeasTab,
  AnalyticsTab,
} from './components/tabs';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { isLoading } = useData();
  const { activeTab } = useAppStore();
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchApproval = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('approved')
        .eq('user_id', user.id)
        .single();
      setApproved(data?.approved ?? false);
    };
    fetchApproval();
  }, [user]);

  if (authLoading || isLoading || approved === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <LoadingSpinner size={48} className="text-blue-600 mb-3" />
        <p className="text-slate-600 font-medium">
          {user ? 'Loading account profile...' : 'Loading TaskHUB...'}
        </p>
      </div>
    );
  }

  if (!user) return <Auth />;

  if (approved === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <LoadingSpinner size={48} className="text-pink-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Awaiting Account Approval
        </h2>
        <p className="text-slate-600 text-sm text-center max-w-sm">
          Your profile has been created and is awaiting admin verification. You’ll gain access
          once your organization tag has been assigned.
        </p>
      </div>
    );
  }

  // Authenticated + approved
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="pt-20 pb-24 px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'tags' && <TagsTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'ideas' && <IdeasTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'admin' && user?.email === 'edanharrofficial@gmail.com' && <AdminDashboard />}
      </main>
      <BottomNavigation />
    </div>
  );
}
