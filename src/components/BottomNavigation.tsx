import {
  Home,
  Users,
  Tag,
  Calendar,
  Lightbulb,
  BarChart3,
  Shield,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useAuth } from '../hooks/useAuth';
import type { TabName } from '../lib/types';
import { motion } from 'framer-motion';

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useAppStore();
  const { user } = useAuth();

  // ✅ Base tabs everyone can see
  let tabs: { id: TabName; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'home', label: 'Home', icon: <Home size={24} />, color: '#EF4444' },
    { id: 'people', label: 'People', icon: <Users size={24} />, color: '#10B981' },
    { id: 'tags', label: 'Tags', icon: <Tag size={24} />, color: '#F97316' },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={24} />, color: '#3B82F6' },
    { id: 'ideas', label: 'Ideas', icon: <Lightbulb size={24} />, color: '#FBBF24' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={24} />, color: '#8B5CF6' },
  ];

  // ✅ Add admin tab only for you
  if (user?.email === 'edanharrofficial@gmail.com') {
    tabs.push({
      id: 'admin' as TabName,
      label: 'Admin',
      icon: <Shield size={24} />,
      color: '#0EA5E9',
    });
  }

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-200 shadow-lg">
      <div className="max-w-[1920px] mx-auto px-2">
        <div className="flex items-center justify-around h-16 relative">
          {/* Sliding highlight */}
          <motion.div
            className="absolute top-2 bottom-2 rounded-2xl pointer-events-none"
            style={{
              width: `calc(100% / ${tabs.length})`,
              backgroundColor: `${tabs[activeIndex]?.color}22`,
            }}
            animate={{
              left: `calc(${activeIndex} * (100% / ${tabs.length}))`,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 28,
            }}
          />

          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex flex-col items-center justify-center flex-1 h-full transition-colors"
              >
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
