
import React, { useState, useEffect } from 'react';
import { User, UserRole, Assignment, Submission, Section } from './types';
import { INITIAL_USERS, INITIAL_ASSIGNMENTS, INITIAL_SUBMISSIONS } from './mockData';
import Layout from './components/Layout';
import AdminDashboard from './views/AdminDashboard';
import TeacherDashboard from './views/TeacherDashboard';
import StudentDashboard from './views/StudentDashboard';
import { loadState, saveState } from './db';

const App: React.FC = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Login Form States
  const [fullNameInput, setFullNameInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [loginError, setLoginError] = useState(false);

  // Hydrate state from IndexedDB on boot
  useEffect(() => {
    const hydrate = async () => {
      try {
        const [savedUser, savedUsers, savedAssignments, savedSubmissions] = await Promise.all([
          loadState('research_user'),
          loadState('research_users'),
          loadState('research_assignments'),
          loadState('research_submissions')
        ]);

        if (savedUser) setUser(savedUser);
        if (savedUsers) setUsers(savedUsers);
        if (savedAssignments) setAssignments(savedAssignments);
        if (savedSubmissions) setSubmissions(savedSubmissions);
      } catch (e) {
        console.error("Hydration failed, using defaults", e);
      } finally {
        setIsHydrated(true);
      }
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    // Save to IndexedDB asynchronously
    saveState('research_users', users);
    saveState('research_assignments', assignments);
    saveState('research_submissions', submissions);
    if (user) {
      saveState('research_user', user);
    } else {
      saveState('research_user', null);
    }
  }, [users, assignments, submissions, user, isHydrated]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    if (ios && !standalone) {
      setShowInstallBanner(true);
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert('To install Mustang Stride on iOS:\n1. Tap the "Share" button at the bottom of Safari.\n2. Scroll down and tap "Add to Home Screen".');
      return;
    }
    
    if (!deferredPrompt) {
      alert('Mustang Stride is ready to use! If you want to install it, use your browser\'s menu.');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setIsStandalone(true);
    }
    setDeferredPrompt(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.name.toLowerCase() === fullNameInput.trim().toLowerCase());
    
    if (foundUser && foundUser.password === password) {
      setUser(foundUser);
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 3000);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setFullNameInput('');
    setPassword('');
    setShowPassword(false);
    setLoginError(false);
  };

  const handleAddAssignment = (data: Partial<Assignment>) => {
    const newAssignment: Assignment = {
      id: `a-${Date.now()}`,
      title: data.title || '',
      description: data.description || '',
      dueDate: data.dueDate || '',
      section: data.section || Section.NONE,
      teacherId: data.teacherId || '',
      teacherName: data.teacherName || '',
      subject: data.subject || '',
      attachments: data.attachments || [],
      createdAt: new Date().toISOString()
    };
    setAssignments([newAssignment, ...assignments]);
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignments(assignments.filter(a => a.id !== id));
    setSubmissions(submissions.filter(s => s.assignmentId !== id));
  };

  const handleUpdateAssignment = (id: string, updates: Partial<Assignment>) => {
    setAssignments(assignments.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleAddSubmission = (data: Partial<Submission>) => {
    const newSubmission: Submission = {
      id: `s-${Date.now()}`,
      assignmentId: data.assignmentId || '',
      studentId: data.studentId || '',
      studentName: data.studentName || '',
      submittedAt: data.submittedAt || new Date().toISOString(),
      files: data.files || [],
      textResponse: data.textResponse,
      status: data.status || 'ON_TIME'
    };
    setSubmissions([newSubmission, ...submissions]);
  };

  const handleAddUser = (data: Partial<User>) => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      username: data.username || '',
      password: data.password || '',
      name: data.name || '',
      role: data.role || UserRole.STUDENT,
      section: data.section || Section.NONE,
      subject: data.subject
    };
    setUsers([...users, newUser]);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const handleUpdateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const InstallBanner = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-emerald-950 text-white p-5 rounded-[2.5rem] shadow-2xl shadow-emerald-900/40 border border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <i className="fas fa-horse-head text-xl"></i>
          </div>
          <div>
            <h4 className="text-sm font-black">Mustang Stride</h4>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Add to home screen</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isIOS ? (
            <div className="text-[10px] bg-emerald-900/50 px-3 py-2 rounded-xl border border-emerald-800 italic">
               Tap <i className="fa-solid fa-arrow-up-from-bracket mx-1"></i> then "Add to Home Screen"
            </div>
          ) : (
            <button 
              onClick={handleInstallClick}
              className="bg-white text-emerald-950 px-5 py-2.5 rounded-2xl text-xs font-black hover:bg-emerald-50 transition-colors shadow-sm"
            >
              Install App
            </button>
          )}
          <button 
            onClick={() => setShowInstallBanner(false)}
            className="w-10 h-10 rounded-2xl hover:bg-white/10 flex items-center justify-center transition-colors text-emerald-400"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  );

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 bg-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-pulse">
            <i className="fas fa-horse-head text-4xl text-white"></i>
          </div>
          <div className="absolute -inset-4 border-2 border-emerald-500/20 rounded-[2.5rem] animate-ping duration-[2000ms]"></div>
        </div>
        <h1 className="text-white font-black tracking-widest uppercase text-xs mt-12 animate-pulse">Synchronizing Research Data</h1>
        <div className="mt-4 w-32 h-1 bg-emerald-900 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 w-1/2 animate-[loading_1.5s_infinite_linear]"></div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {showInstallBanner && <InstallBanner />}
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="inline-block bg-emerald-600 text-white p-4 rounded-3xl mb-4 shadow-xl shadow-emerald-200">
              <i className="fas fa-horse-head text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mustang Stride</h1>
            <p className="text-gray-500 font-medium">Assignment Efficiency Study Platform</p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
            {isResetMode ? (
              <div className="text-center space-y-6">
                <h2 className="text-xl font-bold">Reset Credentials</h2>
                <p className="text-sm text-gray-500">For the research period, please reach out to the researchers to reset your name or password record.</p>
                <button 
                  onClick={() => setIsResetMode(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <i className="fas fa-id-card"></i>
                    </span>
                    <input 
                      type="text" 
                      required
                      value={fullNameInput}
                      onChange={e => {
                        setFullNameInput(e.target.value);
                        if (loginError) setLoginError(false);
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                      placeholder="e.g. Daian Daffon"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <i className="fas fa-lock"></i>
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (loginError) setLoginError(false);
                      }}
                      className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="relative pt-2">
                  {loginError && (
                    <div className="absolute right-0 -top-2 bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-lg shadow-lg shadow-rose-200 animate-bounce">
                      invalid credentials :(
                      <div className="absolute -bottom-1 right-4 w-2 h-2 bg-rose-500 rotate-45"></div>
                    </div>
                  )}
                  <button type="submit" className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${loginError ? 'bg-rose-600 shadow-rose-200' : 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'} text-white`}>
                    Sign In
                  </button>
                </div>
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-xs font-bold text-gray-400 hover:text-emerald-600 uppercase tracking-widest transition-colors"
                  >
                    Need Help?
                  </button>
                </div>
              </form>
            )}
          </div>
          
          <div className="mt-8 flex items-stretch gap-3">
            <div className="flex-1 bg-white/50 p-4 rounded-2xl border border-gray-100 text-center flex flex-col justify-center">
              <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Einstein</span>
              <span className="text-[11px] font-bold text-gray-600">G11 - Sec A</span>
            </div>

            {!isStandalone && (
              <button 
                onClick={handleInstallClick}
                title="Add to Home Screen"
                className="flex-shrink-0 bg-emerald-600 text-white w-14 h-14 rounded-2xl shadow-xl shadow-emerald-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group relative border-2 border-white"
              >
                <i className="fas fa-horse-head text-xl"></i>
                <div className="absolute -top-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
              </button>
            )}

            <div className="flex-1 bg-white/50 p-4 rounded-2xl border border-gray-100 text-center flex flex-col justify-center">
              <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Galilei</span>
              <span className="text-[11px] font-bold text-gray-600">G12 - Sec B</span>
            </div>
          </div>
          
          {!isStandalone && (
            <p className="mt-4 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
              Tap the horse icon to install for offline access
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      {showInstallBanner && <InstallBanner />}
      {user.role === UserRole.ADMIN && (
        <AdminDashboard 
          users={users} 
          assignments={assignments} 
          submissions={submissions}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          onUpdateUser={handleUpdateUser}
        />
      )}
      {user.role === UserRole.TEACHER && (
        <TeacherDashboard 
          user={user} 
          assignments={assignments} 
          submissions={submissions}
          onAddAssignment={handleAddAssignment}
          onDeleteAssignment={handleDeleteAssignment}
          onUpdateAssignment={handleUpdateAssignment}
        />
      )}
      {user.role === UserRole.STUDENT && (
        <StudentDashboard 
          user={user} 
          assignments={assignments} 
          submissions={submissions}
          onSubmit={handleAddSubmission}
        />
      )}
    </Layout>
  );
};

export default App;
