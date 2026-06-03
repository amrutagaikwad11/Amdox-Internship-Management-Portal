import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Award,
  BookOpen,
  LayoutDashboard,
  Clock,
  ShieldAlert,
  Loader,
  Lock,
  Mail,
  User,
  LogOut,
  Cpu,
  BookmarkCheck,
  Search,
  CheckCircle,
  Menu,
  X
} from 'lucide-react';
import DashboardView from './components/DashboardView.jsx';
import InternsView from './components/InternsView.jsx';
import TasksView from './components/TasksView.jsx';
import EvaluationsView from './components/EvaluationsView.jsx';
import CertificatesView from './components/CertificatesView.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('intern_portal_token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loadingUser, setLoadingUser] = useState(!!token);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [logInLoading, setLogInLoading] = useState(false);

  // Public verification form
  const [verifyId, setVerifyId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const fetchCurrentUser = async (authToken) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchAttendanceLog = async (authToken) => {
    try {
      const res = await fetch('/api/attendance/log', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const logs = await res.json();
        setAttendanceLog(logs || []);
      }
    } catch (e) {
      console.error('Error loading attendance list', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
      fetchAttendanceLog(token);
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLogInLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('intern_portal_token', data.token);
        setToken(data.token);
      } else {
        setLoginError(data.error || 'Identity verification failed');
      }
    } catch {
      setLoginError('Server authentication offline');
    } finally {
      setLogInLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('intern_portal_token');
    setToken('');
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleVerifyCertificate = async (e) => {
    e.preventDefault();
    if (!verifyId.trim()) return;

    setVerifyLoading(true);
    setVerifyError('');
    setVerifyResult(null);

    try {
      const res = await fetch(`/api/certificates/verify/${verifyId.trim().toUpperCase()}`);
      const data = await res.json();
      if (res.ok) {
        setVerifyResult(data);
      } else {
        setVerifyError(data.error || 'Zero match listings for certificate hash.');
      }
    } catch {
      setVerifyError('Verification database link disrupted');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Check if current view is authorized for the user
  const tabAuthorized = useMemo(() => {
    if (!user) return false;
    if (activeTab === 'interns' && user.role !== 'Admin' && user.role !== 'Mentor') return false;
    if (activeTab === 'evaluations' && user.role !== 'Admin' && user.role !== 'Mentor' && user.role !== 'Intern') return false;
    return true;
  }, [user, activeTab]);

  const onClockInSuccess = () => {
    if (token) {
      fetchAttendanceLog(token);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-xs text-slate-500 font-medium">Validating secure credentials...</p>
      </div>
    );
  }

  // PUBLIC LANDING & LOGIN PAGE
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
        {/* Verification side */}
        <div className="flex-1 p-6 md:p-12 lg:p-20 flex flex-col justify-between space-y-12">
          <div className="space-y-2">
            <span className="flex items-center gap-2 text-indigo-600 font-bold tracking-tight text-sm">
              <Cpu className="w-5 h-5" /> IMS System Platform
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              Internship Management Portal
            </h2>
            <p className="text-sm text-slate-500 max-w-md font-sans">
              Onboard programmatic candidates, coordinate active deliverables pipelines, evaluate weekly KPI indexes and verify completion directories.
            </p>
          </div>

          {/* Certificate lookup widget */}
          <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm space-y-4 max-w-xl">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 flex items-center gap-1">
                <BookmarkCheck className="w-4 h-4 text-indigo-500" /> Public Verification Desk
              </span>
              <h3 className="text-sm font-bold text-slate-800">Verify Diploma Credential Code</h3>
              <p className="text-xs text-slate-450">Confirm legitimacy of issued certificates by typing original candidate hash code below.</p>
            </div>

            <form onSubmit={handleVerifyCertificate} className="flex gap-2.5">
              <input
                id="public-verify-input"
                type="text"
                placeholder="INT-2026-XXXX"
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-400"
              />
              <button
                id="public-verify-btn"
                type="submit"
                disabled={verifyLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-bold transition duration-75 flex items-center gap-1.5"
              >
                {verifyLoading ? <Loader className="w-3 animate-spin" /> : <Search className="w-3.5" />} Search
              </button>
            </form>

            {/* Render results */}
            {verifyResult && (
              <div id="verify-success-box" className="p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-xl space-y-2 text-xs text-slate-700 animate-slide-up">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold uppercase text-[10px] tracking-wider">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Diploma Verified Authentic
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 font-sans">
                  <div><span className="text-slate-400">Candidate:</span> {verifyResult.candidateName}</div>
                  <div><span className="text-slate-400">Tenure Date:</span> {verifyResult.issueDate}</div>
                  <div><span className="text-slate-450">Track Domain:</span> {verifyResult.domain}</div>
                  <div><span className="text-slate-450">Verified Code:</span> <code className="text-[10px] bg-emerald-100/50 text-emerald-700 font-bold px-1 rounded">{verifyResult.certificateId}</code></div>
                </div>
              </div>
            )}

            {verifyError && (
              <p id="verify-error-box" className="p-3 bg-red-50 text-red-705 border border-red-101 text-xs rounded-xl font-medium animate-slide-up">
                ⚠️ {verifyError}
              </p>
            )}
          </div>

          <div className="text-[11px] text-slate-400 select-none">
            IMS Admin Workspace • Fully Compliant Node.js Backed API and SQLite-based sandbox.
          </div>
        </div>

        {/* Login form side */}
        <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 p-6 md:p-12 lg:p-20 flex flex-col justify-center text-white relative">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div className="space-y-1.5">
              <span className="px-2.5 py-0.5 text-[10px] bg-indigo-500/30 text-indigo-300 font-bold rounded-full uppercase tracking-widest block w-fit">
                Gatekeeper Auth
              </span>
              <h2 className="text-2xl font-bold tracking-tight">Access Portal credentials</h2>
              <p className="text-xs text-slate-350">Login using provided domain admin, mentor, or intern credentials.</p>
            </div>

            {loginError && (
              <div id="login-error-alert" className="p-3 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 text-slate-500" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    placeholder="e.g. admin@ims.org"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Passphrase</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 text-slate-500" />
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={logInLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex justify-center items-center gap-1.5 duration-100 disabled:opacity-50"
              >
                {logInLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Acknowledge Credentials'}
              </button>
            </form>

            {/* Predefined mock credits for easy onboarding access */}
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 text-[11px] space-y-1 text-slate-300">
              <span className="font-bold block text-indigo-400 uppercase tracking-widest text-[9.5px]">Development Gateway Credentials:</span>
              <div className="grid grid-cols-2 gap-y-1 font-mono">
                <div><span className="text-slate-450">Admin:</span> admin@ims.org</div>
                <div><span className="text-slate-450">Pwd:</span> password123</div>
                <div><span className="text-slate-450">Mentor:</span> james@ims.org</div>
                <div><span className="text-slate-450">Pwd:</span> password123</div>
                <div><span className="text-slate-450">Intern:</span> sarah@ims.org</div>
                <div><span className="text-slate-450">Pwd:</span> password123</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-950 text-white border-b border-slate-800">
        <span className="flex items-center gap-1.5 font-bold text-xs tracking-tight text-white uppercase">
          <Cpu className="w-4 h-4 text-indigo-500" /> IMS System
        </span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1">
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Primary Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 bottom-0 z-40 w-64 bg-slate-950 text-slate-300 flex flex-col justify-between p-5 border-r border-slate-800 transform transition-transform duration-300 md:transform-none ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-500" />
            <div>
              <span className="block font-black tracking-tight text-white uppercase text-sm leading-none">IMS Workspace</span>
              <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">Central Controller</span>
            </div>
          </div>

          {/* User profile identifier */}
          <div className="p-3 bg-slate-900 border border-slate-800/85 rounded-xl space-y-1 relative">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate max-w-[140px] uppercase">{user.name}</span>
                <span className="block text-[10px] text-slate-450 truncate font-mono">{user.email}</span>
              </div>
            </div>
            <span className="absolute top-1 right-2 px-1.5 py-0.5 text-[8px] bg-indigo-500/35 text-indigo-300 font-bold rounded-full uppercase">
              {user.role}
            </span>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1 text-xs">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-bold duration-75 text-left ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard Workspace
            </button>

            {(user.role === 'Admin' || user.role === 'Mentor') && (
              <button
                onClick={() => { setActiveTab('interns'); setIsSidebarOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-bold duration-75 text-left ${
                  activeTab === 'interns' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" /> Candidate Roster
              </button>
            )}

            <button
              onClick={() => { setActiveTab('tasks'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-bold duration-75 text-left ${
                activeTab === 'tasks' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Kanban Tasks
            </button>

            <button
              onClick={() => { setActiveTab('evaluations'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-bold duration-75 text-left ${
                activeTab === 'evaluations' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4" /> Evaluations score
            </button>

            <button
              onClick={() => { setActiveTab('certificates'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-bold duration-75 text-left ${
                activeTab === 'certificates' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" /> Certificates Ledger
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 bg-slate-90 w-full rounded-lg hover:bg-slate-900 text-slate-450 hover:text-white font-bold text-xs duration-75 text-left border border-slate-900 hover:border-slate-800"
        >
          <LogOut className="w-4 h-4" /> Logout session
        </button>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-8 overflow-x-hidden min-h-screen">
        {tabAuthorized ? (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                token={token}
                user={user}
                onCheckInSuccess={onClockInSuccess}
                attendanceLog={attendanceLog}
              />
            )}
            {activeTab === 'interns' && (
              <InternsView
                token={token}
                user={user}
              />
            )}
            {activeTab === 'tasks' && (
              <TasksView
                token={token}
                user={user}
              />
            )}
            {activeTab === 'evaluations' && (
              <EvaluationsView
                token={token}
                user={user}
              />
            )}
            {activeTab === 'certificates' && (
              <CertificatesView
                token={token}
                user={user}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-205 text-center max-w-sm mx-auto my-20">
            <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Authorization Restriction</h3>
            <p className="text-xs text-slate-400 mt-1">This workspace requires advanced admin domain level authorization.</p>
          </div>
        )}
      </main>
    </div>
  );
}
