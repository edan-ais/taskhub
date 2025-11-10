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

// Import each tab individually (no index.ts dependency)
import { HomeTab } from './components/tabs/HomeTab';
import { PeopleTab } from './components/tabs/PeopleTab';
import { TagsTab } from './components/tabs/TagsTab';
import { CalendarTab } from './components/tabs/CalendarTab';
import { IdeasTab } from './components/tabs/IdeasTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { isLoading } = useData();
  const { activeTab } = useAppStore();

  const [approved, setApproved] = useState<boolean | null>(null);

  /* -------------------------------------------------------------------------- */
  /*                     FETCH PROFILE APPROVAL STATUS (once)                   */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const fetchApproval = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('approved')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading profile:', error);
          setApproved(false);
        } else {
          setApproved(data?.approved ?? false);
        }
      } catch (err) {
        console.error('Unexpected error loading approval:', err);
        setApproved(false);
      }
    };

    fetchApproval();
  }, [user]);

  /* -------------------------------------------------------------------------- */
  /*                                 LOADING STATE                              */
  /* -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------- */
  /*                              UNAUTHENTICATED                               */
  /* -------------------------------------------------------------------------- */
  if (!user) return <Auth />;

  /* -------------------------------------------------------------------------- */
  /*                             AWAITING APPROVAL                              */
  /* -------------------------------------------------------------------------- */
  if (approved === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <LoadingSpinner size={48} className="text-pink-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Awaiting Account Approval
        </h2>
        <p className="text-slate-600 text-sm text-center max-w-sm">
          Your profile has been created and is awaiting admin verification. You’ll gain
          access once your organization tag has been assigned.
        </p>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                        AUTHENTICATED + APPROVED USER                       */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="pt-20 pb-24 px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto">
        {/* Tab rendering */}
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'tags' && <TagsTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'ideas' && <IdeasTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}

        {/* Admin tab — visible only to Edan */}
        {activeTab === 'admin' &&
          user?.email === 'edanharrofficial@gmail.com' && <AdminDashboard />}
      </main>

      <BottomNavigation />
    </div>
  );
}
