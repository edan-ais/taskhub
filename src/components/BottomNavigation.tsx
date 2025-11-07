import { Home, Users, Tag, Calendar, Lightbulb, BarChart3 } from 'lucide-react';
import { useAppStore } from '../lib/store';
import type { TabName } from '../lib/types';
import { motion } from 'framer-motion';

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useAppStore();

  const tabs: { id: TabName; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'home', label: 'Home', icon: <Home size={24} />, color: '#EF4444' },
    { id: 'people', label: 'People', icon: <Users size={24} />, color: '#10B981' },
    { id: 'tags', label: 'Tags', icon: <Tag size={24} />, color: '#F97316' },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={24} />, color: '#3B82F6' },
    { id: 'ideas', label: 'Ideas', icon: <Lightbulb size={24} />, color: '#FBBF24' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={24} />, color: '#8B5CF6' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-200 shadow-lg">
      <div className="max-w-[1920px] mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex flex-col items-center justify-center flex-1 h-full overflow-hidden"
              >
                {/* animated pill stays INSIDE the button now */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 mx-2 my-1 rounded-2xl"
                    style={{
                      backgroundColor: `${tab.color}33`, // light version of tab color
                    }}
                    transition={{
                      layout: {
                        type: 'spring',
                        stiffness: 320,
                        damping: 30,
                      },
                      opacity: { duration: 0.15 },
                    }}
                  />
                )}

                <div
                  className="relative z-10 transition-colors"
                  style={{ color: isActive ? tab.color : '#64748B' }}
                >
                  {tab.icon}
                </div>
                <span
                  className="relative z-10 text-xs mt-1 font-medium transition-colors"
                  style={{ color: isActive ? tab.color : '#64748B' }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
