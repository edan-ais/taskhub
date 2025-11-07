import { useMemo } from 'react';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { isPast, parseISO, format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export function AnalyticsTab() {
  const { tasks, tags, divisions } = useAppStore();

  const analytics = useMemo(() => {
    const total = tasks.length;
    const byLane = {
      red: tasks.filter((t) => t.lane === 'red').length,
      yellow: tasks.filter((t) => t.lane === 'yellow').length,
      green: tasks.filter((t) => t.lane === 'green').length,
    };

    const overdue = tasks.filter(
      (t) => t.due_date && isPast(parseISO(t.due_date)) && t.lane !== 'green'
    ).length;

    const byProgress = {
      not_started: tasks.filter((t) => t.progress_state === 'not_started').length,
      working: tasks.filter((t) => t.progress_state === 'working').length,
      blocked: tasks.filter((t) => t.progress_state === 'blocked').length,
      needs_review: tasks.filter((t) => t.progress_state === 'needs_review').length,
      completed: tasks.filter((t) => t.progress_state === 'completed').length,
    };

    const completionRate = total > 0 ? ((byLane.green / total) * 100).toFixed(1) : '0';

    const peopleStats = Array.from(
      tasks.reduce((acc, task) => {
        if (task.assignee) {
          const count = acc.get(task.assignee) || 0;
          acc.set(task.assignee, count + 1);
        }
        return acc;
      }, new Map<string, number>())
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const tagStats = tags
      .map((tag) => ({
        name: tag.name,
        count: tasks.filter((t) => t.tags?.some((tg) => tg.id === tag.id)).length,
        color: tag.color,
      }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);

    const divisionStats = divisions
      .map((division) => ({
        name: division.name,
        count: tasks.filter((t) => t.divisions?.some((d) => d.id === division.id)).length,
        color: division.color,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);

    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weeklyActivity = weekDays.map((day) => {
      const dayTasks = tasks.filter(
        (t) => t.due_date && parseISO(t.due_date).toDateString() === day.toDateString()
      );
      return {
        day: format(day, 'EEE'),
        tasks: dayTasks.length,
        completed: dayTasks.filter((t) => t.lane === 'green').length,
      };
    });

    return {
      total,
      byLane,
      overdue,
      byProgress,
      completionRate,
      peopleStats,
      tagStats,
      divisionStats,
      weeklyActivity,
    };
  }, [tasks, tags, divisions]);

  const laneData = [
    { name: 'To-Do', value: analytics.byLane.red, color: '#EF4444' },
    { name: 'Pending', value: analytics.byLane.yellow, color: '#F59E0B' },
    { name: 'Completed', value: analytics.byLane.green, color: '#10B981' },
  ];

  const progressData = [
    { name: 'Not Started', count: analytics.byProgress.not_started },
    { name: 'Working', count: analytics.byProgress.working },
    { name: 'Blocked', count: analytics.byProgress.blocked },
    { name: 'Needs Review', count: analytics.byProgress.needs_review },
    { name: 'Completed', count: analytics.byProgress.completed },
  ];

  return (
    <div className="mt-[100px] md:mt-0 px-4 md:px-6 lg:px-8 space-y-6">
      {/* Summary Cards */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <BarChart3 size={28} />
          Analytics Dashboard
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-600 rounded-xl border-2 border-blue-700 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={24} />
              <span className="text-3xl font-bold">{analytics.total}</span>
            </div>
            <div className="text-sm opacity-90">Total Tasks</div>
          </div>

          <div className="bg-green-600 rounded-xl border-2 border-green-700 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={24} />
              <span className="text-3xl font-bold">{analytics.completionRate}%</span>
            </div>
            <div className="text-sm opacity-90">Completion Rate</div>
          </div>

          <div className="bg-red-600 rounded-xl border-2 border-red-700 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle size={24} />
              <span className="text-3xl font-bold">{analytics.overdue}</span>
            </div>
            <div className="text-sm opacity-90">Overdue Tasks</div>
          </div>

          <div className="bg-yellow-600 rounded-xl border-2 border-yellow-700 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock size={24} />
              <span className="text-3xl font-bold">{analytics.byLane.yellow}</span>
            </div>
            <div className="text-sm opacity-90">Pending Approval</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Tasks by Lane</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={laneData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {laneData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Progress State Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Weekly Activity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.weeklyActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="tasks" stroke="#3B82F6" name="Total Tasks" strokeWidth={2} />
            <Line type="monotone" dataKey="completed" stroke="#10B981" name="Completed" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* People, Tags, Divisions */}
      {analytics.peopleStats.length > 0 && (
        <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Tasks by Team Member</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.peopleStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics.tagStats.length > 0 && (
          <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Top Tags</h3>
            <div className="space-y-3">
              {analytics.tagStats.slice(0, 8).map((tag) => (
                <div key={tag.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{tag.name}</span>
                      <span className="text-sm text-slate-600">{tag.count}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(tag.count / analytics.total) * 100}%`,
                          backgroundColor: tag.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analytics.divisionStats.length > 0 && (
          <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Divisions</h3>
            <div className="space-y-3">
              {analytics.divisionStats.map((division) => (
                <div key={division.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{division.name}</span>
                      <span className="text-sm text-slate-600">{division.count}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(division.count / analytics.total) * 100}%`,
                          backgroundColor: division.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
