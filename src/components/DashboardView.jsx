import { useState, useEffect } from 'react';
import { Users, BookOpen, Clock, FileCheck, CheckCircle, Play, LogOut } from 'lucide-react';

export default function DashboardView({ token, user, onCheckInSuccess, attendanceLog }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState('');
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // Digital clock loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimer(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if already checked in / checked out today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const logged = attendanceLog.find((a) => a.internId === user.internId && a.date === today);
    setCheckedInToday(!!(logged && logged.checkIn));
    setCheckedOutToday(!!(logged && logged.checkOut));
  }, [attendanceLog, user.internId]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Error fetching dashboard stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token, attendanceLog]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        onCheckInSuccess();
        fetchStats();
      } else {
        alert(data.error || 'Check-in failed');
      }
    } catch {
      alert('Internal network error');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        onCheckInSuccess();
        fetchStats();
      } else {
        alert(data.error || 'Check-out failed');
      }
    } catch {
      alert('Internal network error');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Clock className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <p className="text-sm">Assembling dashboard telemetry...</p>
      </div>
    );
  }

  // Pure SVG Pie Chart Calculations
  const totalTaskCount = stats.taskStatusStats.pending + stats.taskStatusStats.inProgress + stats.taskStatusStats.completed;
  const drawPieChart = () => {
    if (totalTaskCount === 0) return <circle cx="50" cy="50" r="40" fill="#e2e8f0" />;
    
    let currentAngle = 0;
    const slices = [
      { count: stats.taskStatusStats.completed, color: '#10b981', label: 'Completed' },
      { count: stats.taskStatusStats.inProgress, color: '#f59e0b', label: 'In Progress' },
      { count: stats.taskStatusStats.pending, color: '#ef4444', label: 'Pending' },
    ];

    return slices.map((slice, index) => {
      if (slice.count === 0) return null;
      const percentage = slice.count / totalTaskCount;
      const angle = percentage * 360;

      // Coordinates for slice
      const x1 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
      const y1 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
      currentAngle += angle;
      const x2 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
      const y2 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);

      const largeArc = angle > 180 ? 1 : 0;
      const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return (
        <path
          key={index}
          d={pathData}
          fill={slice.color}
          className="transition-all hover:opacity-90 duration-300"
          title={`${slice.label}: ${slice.count}`}
        />
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 bg-slate-900 text-white rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <span className="px-2.5 py-0.5 text-xs bg-indigo-500/30 text-indigo-300 font-medium rounded-full uppercase tracking-wider">
            {user.role} workspace
          </span>
          <h1 id="welcome-heading" className="text-2xl font-bold tracking-tight">Welcome, {user.name}</h1>
          <p className="text-sm text-slate-300">
            Lifecycle monitoring is active. Portals verified and synced to cloud run container storage.
          </p>
        </div>
        
        {/* Dynamic UTC clock and check-in for Intern */}
        <div className="mt-4 md:mt-0 flex items-center gap-4 relative z-10 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/50">
          <div className="text-right">
            <span className="block text-xs uppercase tracking-widest text-slate-400">Current Time</span>
            <span className="text-lg font-mono font-bold text-indigo-400">{timer || '00:00:00'}</span>
          </div>
          {user.role === 'Intern' && (
            <div className="border-l border-slate-700 pl-4 flex flex-col sm:flex-row gap-2">
              {!checkedInToday ? (
                <button
                  id="dashboard-checkin-btn"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 font-medium rounded-lg text-sm hover:from-indigo-600 hover:to-violet-700 text-white active:scale-95 duration-100 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" /> Check-In
                </button>
              ) : !checkedOutToday ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Present
                  </div>
                  <button
                    id="dashboard-checkout-btn"
                    onClick={handleCheckOut}
                    disabled={checkingIn}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium hover:bg-rose-500/30 active:scale-95 duration-100"
                  >
                    <LogOut className="w-3 h-3" /> Check-Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col text-slate-300 text-xs">
                  <span className="text-emerald-400 font-bold">✓ Day Session Logged</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      </div>

      {/* 2. Key metrics block */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-lg bg-violet-50 text-violet-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm text-slate-500">Total Interns</span>
            <h3 id="stat-total-interns" className="text-2xl font-bold text-slate-800 uppercase font-mono mt-0.5">{stats.totalInterns}</h3>
            <span className="text-xs text-emerald-600 font-medium">✦ Onboarded</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm text-slate-500">Tasks Pipeline</span>
            <h3 id="stat-total-tasks" className="text-2xl font-bold text-slate-800 uppercase font-mono mt-0.5">{stats.totalTasks}</h3>
            <span className="text-xs text-blue-600 font-medium">Assigned Tracks</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm text-slate-500">Completion Rate</span>
            <h3 id="stat-completion-rate" className="text-2xl font-bold text-slate-800 uppercase font-mono mt-0.5">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
            </h3>
            <span className="text-xs text-slate-400">{stats.completedTasks} of {stats.totalTasks} Done</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm text-slate-500">Attendance Sync</span>
            <h3 id="stat-attendance-rate" className="text-2xl font-bold text-slate-800 uppercase font-mono mt-0.5">{stats.attendanceRate}%</h3>
            <span className="text-xs text-amber-600 font-medium">Live sync rate</span>
          </div>
        </div>
      </div>

      {/* 3. Render SVG interactive diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task spread pie chart */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Task Allocation Status</h2>
            <p className="text-xs text-slate-400 mb-4">Spread showing overall milestones execution</p>
          </div>
          <div className="flex justify-center items-center py-4">
            <div className="w-36 h-36 relative">
              <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                {drawPieChart()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center m-4 bg-white rounded-full border border-slate-100 shadow-sm">
                <span className="text-lg font-bold text-slate-800 font-mono">{totalTaskCount}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Tasks</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-slate-600 mt-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed</span>
              <span className="font-semibold">{stats.taskStatusStats.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> In Progress</span>
              <span className="font-semibold">{stats.taskStatusStats.inProgress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Pending</span>
              <span className="font-semibold">{stats.taskStatusStats.pending}</span>
            </div>
          </div>
        </div>

        {/* Domain counts bar chart */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Intern Domains Allocation</h2>
            <p className="text-xs text-slate-400 mb-4">Active students grouped by core expertise</p>
          </div>
          <div className="flex-1 flex flex-col justify-end gap-3 h-48 py-2">
            {stats.domainStats.length === 0 ? (
              <p className="text-center text-xs text-slate-400 my-auto">No domain metrics available.</p>
            ) : (
              stats.domainStats.map((item, id) => {
                const maxCount = Math.max(...stats.domainStats.map((d) => d.count), 1);
                const barPercent = (item.count / maxCount) * 100;
                return (
                  <div key={id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                      <span>{item.name}</span>
                      <span className="font-semibold text-slate-800">{item.count} Intern{item.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        style={{ width: `${barPercent}%` }}
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p className="text-[11px] mt-4 leading-relaxed font-normal">
            ⚙️ Dynamically indexed tracking synced with HR onboarding database.
          </p>
        </div>
      </div>

      {/* 4. Recent submissions logs */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-3">Recent Submissions Review Logs</h2>
        {stats.recentSubmissions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No recent task solutions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2">Intern</th>
                  <th className="py-2">Task Title</th>
                  <th className="py-2">Submitted Time</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSubmissions.map((s, index) => (
                  <tr key={index} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-700">{s.internName}</td>
                    <td className="py-3 text-slate-600 max-w-xs truncate">{s.taskTitle}</td>
                    <td className="py-3 text-slate-500">{new Date(s.timestamp).toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full font-medium ${
                        s.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : s.status === 'Changes Requested'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
