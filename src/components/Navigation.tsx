import { Search, EyeOff, Eye, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useData } from '../hooks/useData';
import { useState } from 'react';

export function Navigation() {
  const { searchQuery, setSearchQuery, hideCompleted, setHideCompleted } = useAppStore();
  const { fetchTasks, fetchDivisions, fetchTags, fetchIdeas, fetchPeople, fetchEmails } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchTasks(),
      fetchDivisions(),
      fetchTags(),
      fetchIdeas(),
      fetchPeople(),
      fetchEmails()
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-200 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        {/* ORIGINAL DESKTOP ROW — unchanged */}
        <div className="flex items-center justify-between h-16">
          {/* logo */}
          <div className="flex items-center gap-2">
            <CheckCircle2 size={28} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">TaskHUB</h1>
          </div>

          {/* right section: buttons + desktop search */}
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

            {/* DESKTOP SEARCH — stays inline */}
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
          </div>
        </div>

        {/* MOBILE SEARCH ROW — only shows below on small screens */}
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
