import { useData } from './hooks/useData';
import { useAppStore } from './lib/store';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import { Navigation } from './components/Navigation';
import { BottomNavigation } from './components/BottomNavigation';
import { HomeTab } from './components/tabs/HomeTab';
import { PeopleTab } from './components/tabs/PeopleTab';
import { TagsTab } from './components/tabs/TagsTab';
import { CalendarTab } from './components/tabs/CalendarTab';
import { IdeasTab } from './components/tabs/IdeasTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';
import { TaskDrawer } from './components/TaskDrawer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { LoadingSpinner } from './components/LoadingSpinner';

export default function App() {
  const { isLoading } = useData();
  const { user, loading: authLoading, signOut } = useAuth();
  const { activeTab, deleteConfirmation, hideDeleteConfirmation } = useAppStore();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size={48} className="text-blue-600 mb-4" />
          <p className="text-slate-600 text-lg font-medium">
            Loading TaskHUB...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

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
      </main>

      <BottomNavigation />
      <TaskDrawer />

      {deleteConfirmation && (
        <ConfirmDialog
          isOpen={deleteConfirmation.isOpen}
          title={deleteConfirmation.title}
          message={deleteConfirmation.message}
          onConfirm={() => {
            deleteConfirmation.onConfirm();
            hideDeleteConfirmation();
          }}
          onCancel={hideDeleteConfirmation}
        />
      )}
    </div>
  );
}
