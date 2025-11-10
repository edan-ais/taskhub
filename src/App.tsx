import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { useAppStore } from './lib/store';
import { useData } from './hooks/useData';
import Auth from './components/Auth';
import { Navigation } from './components/Navigation';
import { BottomNavigation } from './components/BottomNavigation';
import AdminDashboard from './components/AdminDashboard';
import { LoadingSpinner } from './components/LoadingSpinner';

// Tabs
import { HomeTab } from './components/tabs/HomeTab';
import { PeopleTab } from './components/tabs/PeopleTab';
import { TagsTab } from './components/tabs/TagsTab';
import { CalendarTab } from './components/tabs/CalendarTab';
import { IdeasTab } from './components/tabs/IdeasTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';

/* -------------------------------------------------------------------------- */
/*                                 MAIN APP                                   */
/* -------------------------------------------------------------------------- */

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { isLoading } = useData();
  const { activeTab } = useAppStore();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  /* -------------------------------------------------------------------------- */
  /*                      ENSURE PROFILE EXISTS / IS UPDATED                   */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const ensureProfile = async () => {
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      try {
        // Pull profile by user_id
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const isAdmin = user.email === 'edanharrofficial@gmail.com';
        const defaultOrg = 'We Grow With, LLC';

        if (!data || error?.code === 'PGRST116') {
          // Profile doesn't exist → create one
          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email: user.email,
              approved: true,
              permission_level: isAdmin ? 'admin' : 'user',
              organization_tag: isAdmin ? 'WW529400' : defaultOrg,
            })
            .select('*')
            .maybeSingle();

          if (insertError) throw insertError;
          setProfile(inserted);
        } else {
          // Ensure correct admin info
          if (isAdmin) {
            const needsUpdate =
              data.organization_tag !== 'WW529400' ||
              data.permission_level !== 'admin' ||
              data.approved !== true;

            if (needsUpdate) {
              await supabase
                .from('profiles')
                .update({
                  organization_tag: 'WW529400',
                  permission_level: 'admin',
                  approved: true,
                })
                .eq('user_id', user.id);
            }
          }

          // Make sure approved & org_tag aren't null for anyone
          if (!data.approved || !data.organization_tag) {
            await supabase
              .from('profiles')
              .update({
                approved: true,
                organization_tag:
                  data.organization_tag || (isAdmin ? 'WW529400' : defaultOrg),
              })
              .eq('user_id', user.id);
          }

          setProfile({ ...data, approved: true });
        }
      } catch (err) {
        console.error('Error ensuring profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    ensureProfile();
  }, [user]);

  /* -------------------------------------------------------------------------- */
  /*                               LOADING STATES                               */
  /* -------------------------------------------------------------------------- */
  if (authLoading || isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <LoadingSpinner size={48} className="text-blue-600 mb-3" />
        <p className="text-slate-600 font-medium">
          {user ? 'Loading your workspace...' : 'Loading TaskHUB...'}
        </p>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                            UNAUTHENTICATED USERS                           */
  /* -------------------------------------------------------------------------- */
  if (!user) return <Auth />;

  /* -------------------------------------------------------------------------- */
  /*                              MAIN DASHBOARD                                */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="pt-20 pb-24 px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto">
        {/* Tabs */}
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'tags' && <TagsTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'ideas' && <IdeasTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}

        {/* Admin-only dashboard */}
        {activeTab === 'admin' &&
          user?.email === 'edanharrofficial@gmail.com' && <AdminDashboard />}
      </main>

      <BottomNavigation />
    </div>
  );
}
