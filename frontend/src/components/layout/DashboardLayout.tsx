import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Menu, Bell, LogOut, Settings, HelpCircle, Search, X, Laptop, Clock,
  User, Award, Shield, Users, Target, Ticket, FileText, ChevronDown, Wallet, Calendar, MapPin, GitFork, Trophy
} from 'lucide-react';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, notifications } = useAuth();
  const { theme, toggleTheme, t } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setIsHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sidebarItems: SidebarItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <Laptop className="w-5 h-5" /> },
    { label: 'Agent Management', path: '/agents', icon: <GitFork className="w-5 h-5" /> },
    { label: 'Vendors', path: '/vendors', icon: <Users className="w-5 h-5" /> },
    { label: 'Targets & Tasks', path: '/targets', icon: <Target className="w-5 h-5" /> },
    { label: 'Field Visits', path: '/field-visits', icon: <MapPin className="w-5 h-5" /> },
    { label: 'Support Tickets', path: '/tickets', icon: <Ticket className="w-5 h-5" /> },
    { label: 'Wallet', path: '/wallet', icon: <Wallet className="w-5 h-5" /> },
    { label: 'Reports', path: '/reports', icon: <FileText className="w-5 h-5" /> },
    { label: 'Notifications', path: '/shared/notifications', icon: <Bell className="w-5 h-5" /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy className="w-5 h-5 text-amber-500" /> },
    { label: 'Profile', path: '/shared/profile', icon: <User className="w-5 h-5" /> },
    { label: 'Settings', path: '/shared/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const effectiveRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();

  const userKycStatus = (user?.kycStatus || 'approved').toLowerCase();
  const userStatus = String(user?.status || 'active').toLowerCase();

  if (userKycStatus === 'pending' || userStatus === 'pending_approval' || userStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#fbf9f8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-[#eae8e7] shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-[#1b1c1c]">Registration Pending Verification</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Your registration request is currently pending Admin verification. Please contact the Administrator for further assistance.
          </p>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <p className="text-[11px] text-slate-400 font-bold">Registration ID: {user?.registrationId || 'N/A'}</p>
            <button
              onClick={logout}
              className="py-2.5 px-4 bg-[#864f19] hover:bg-[#a3672f] text-white text-xs font-bold rounded-xl transition cursor-pointer border-none"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userKycStatus === 'rejected' || userStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-[#fbf9f8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-rose-200 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600">
            <X className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-black text-rose-800">Registration Application Rejected</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Your registration request was rejected by Admin. Reason: <strong>{user?.rejectionReason || 'No reason provided.'}</strong>. Please contact the Administrator for assistance.
          </p>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <p className="text-[11px] text-slate-400 font-bold">Registration ID: {user?.registrationId || 'N/A'}</p>
            <button
              onClick={logout}
              className="py-2.5 px-4 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition cursor-pointer border-none"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userStatus === 'suspended' || userStatus === 'inactive') {
    return (
      <div className="min-h-screen bg-[#fbf9f8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-600">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Account Suspended / Deactivated</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Your account has been suspended/deactivated by the Admin. Please contact the Administrator for assistance.
          </p>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={logout}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer border-none"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visibleSidebarItems = sidebarItems.filter(item => {
    if (item.path === '/agents' && effectiveRole === 'pincode') {
      return false;
    }
    return true;
  });

  const unreadNotifs = notifications?.filter(n => !n.read) || [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fbf9f8] text-[#1b1c1c] font-sans antialiased">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Sidebar - Desktop collapsible */}
      <aside
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className={`hidden md:flex flex-col ${isSidebarExpanded ? 'w-72' : 'w-20'} h-screen sticky top-0 bg-white border-r border-[#d7c3b5]/40 py-6 transition-all duration-300 ease-in-out shrink-0 z-50`}
      >
        {/* Logo Section - Clickable link to /dashboard */}
        <Link
          to="/dashboard"
          title="Go to Dashboard"
          className={`flex items-center w-full shrink-0 ${isSidebarExpanded ? 'px-6' : 'justify-center'} transition-all duration-300 mb-8 cursor-pointer group`}
        >
          <img
            src="/logo.jpg"
            alt="Logo"
            className="h-10 w-10 rounded-xl object-contain shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
          />
          <div className={`flex flex-col transition-all duration-300 ease-in-out origin-left ${
            isSidebarExpanded 
              ? 'opacity-100 max-w-xs ml-3 translate-x-0' 
              : 'opacity-0 max-w-0 translate-x-[-10px] pointer-events-none'
          }`}>
            <h1 className="font-bold text-sm text-[#864f19] leading-tight tracking-tight whitespace-nowrap group-hover:text-[#a3672f] transition-colors">Connect Portal</h1>
            <p className="text-[8px] uppercase tracking-widest text-[#52443a] font-black opacity-80 mt-0.5 whitespace-nowrap">Enterprise Management</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className={`flex-grow overflow-y-auto scrollbar-none flex flex-col w-full space-y-3 ${isSidebarExpanded ? 'px-4.5' : 'items-center px-2'}`}>
          {visibleSidebarItems.map((item, idx) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={idx}
                to={item.path}
                title={!isSidebarExpanded ? item.label : undefined}
                className={`flex items-center transition-all duration-250 rounded-xl w-full ${isSidebarExpanded ? 'px-4 py-3.5 gap-4' : 'p-3 justify-center'} ${
                  isActive
                    ? 'bg-[#864f19] text-white font-bold shadow-md scale-[1.02]'
                    : 'text-[#52443a] hover:bg-[#f6f3f2] hover:text-[#1b1c1c] hover:translate-x-1'
                } active:scale-95`}
              >
                <span className="shrink-0 flex items-center transition-transform duration-200">{item.icon}</span>
                <span className={`text-sm font-bold tracking-wide transition-all duration-300 ease-in-out origin-left whitespace-nowrap ${
                  isSidebarExpanded 
                    ? 'opacity-100 max-w-xs translate-x-0' 
                    : 'opacity-0 max-w-0 translate-x-[-10px] pointer-events-none'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Area */}
        <div className={`mt-auto pt-4 border-t border-[#d7c3b5]/40 space-y-1 shrink-0 ${isSidebarExpanded ? 'px-4.5' : 'px-2'}`}>
          <button
            onClick={handleLogout}
            title={!isSidebarExpanded ? 'Logout' : undefined}
            className={`flex items-center transition-all duration-250 rounded-xl text-[#ba1a1a] hover:bg-red-50 w-full text-left border-none cursor-pointer active:scale-95 ${
              isSidebarExpanded ? 'px-4 py-3.5 gap-4' : 'p-3 justify-center'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] text-[#ba1a1a] transition-transform duration-200">logout</span>
            <span className={`text-sm font-bold tracking-wide transition-all duration-300 ease-in-out origin-left whitespace-nowrap ${
              isSidebarExpanded 
                ? 'opacity-100 max-w-xs translate-x-0' 
                : 'opacity-0 max-w-0 translate-x-[-10px] pointer-events-none'
            }`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top Header */}
        {location.pathname === '/dashboard' && (
          <header className="flex justify-between items-center w-full px-8 h-16 sticky top-0 z-40 bg-[#f6f3f2] border-b border-[#d7c3b5]/30">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open mobile menu"
                className="md:hidden p-2 text-[#1b1c1c] hover:bg-[#eae8e7] rounded-xl transition"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Header search bar removed as requested */}
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                {/* Notifications Dropdown */}
                <div className="relative" ref={notifMenuRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="p-2 text-[#52443a] hover:bg-[#eae8e7] rounded-full transition-colors relative border-none bg-transparent cursor-pointer flex items-center"
                  >
                    <span className="material-symbols-outlined text-xl">notifications</span>
                    {unreadNotifs.length > 0 && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ba1a1a] rounded-full"></span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-[#d7c3b5]/40 rounded-2xl shadow-xl py-3 z-50 text-xs text-left animate-fade-in space-y-2">
                      <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                        <span className="font-extrabold text-slate-800">Unread Alerts ({unreadNotifs.length})</span>
                        <Link to="/shared/notifications" onClick={() => setNotifDropdownOpen(false)} className="text-[#864f19] hover:underline font-bold text-[10px] uppercase">View All</Link>
                      </div>
                      <div className="max-h-[240px] overflow-y-auto divide-y divide-slate-50">
                        {unreadNotifs.length === 0 ? (
                          <p className="py-6 text-center text-slate-400 font-semibold">No new notifications</p>
                        ) : (
                          unreadNotifs.slice(0, 4).map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                setNotifDropdownOpen(false);
                                navigate('/shared/notifications');
                              }}
                              className="p-3 hover:bg-[#fbf9f8] transition-colors space-y-0.5 cursor-pointer"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-[#1b1c1c] text-[11px] truncate max-w-[170px]">{notif.title}</span>
                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                  notif.priority === 'high' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                                }`}>{notif.priority}</span>
                              </div>
                              <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-2">{notif.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t border-slate-100 text-center bg-[#fbf9f8] rounded-b-2xl">
                        <button
                          onClick={() => {
                            setNotifDropdownOpen(false);
                            navigate('/shared/notifications');
                          }}
                          className="w-full text-[11px] font-bold text-[#864f19] hover:underline cursor-pointer bg-transparent border-none py-1 flex items-center justify-center gap-1"
                        >
                          View All Notifications →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Help Center Dropdown */}
                <div className="relative" ref={helpMenuRef}>
                  <button
                    onClick={() => setIsHelpOpen(!isHelpOpen)}
                    className="p-2 text-[#52443a] hover:bg-[#eae8e7] rounded-full transition-colors border-none bg-transparent cursor-pointer flex items-center"
                  >
                    <span className="material-symbols-outlined text-xl">help</span>
                  </button>

                  {isHelpOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#d7c3b5]/40 rounded-2xl shadow-xl py-2.5 z-50 text-xs text-left animate-fade-in space-y-1">
                      <div className="px-4 py-1.5 border-b border-slate-100 mb-1">
                        <span className="font-extrabold text-slate-800">Support Resources</span>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => {
                          setIsHelpOpen(false);
                        }}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-[#f6f3f2] text-slate-700 font-bold"
                      >
                        <span className="material-symbols-outlined text-sm text-[#864f19]">chat</span>
                        Live Chat Assistant
                      </Link>
                      <Link
                        to="/tickets"
                        onClick={() => setIsHelpOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-[#f6f3f2] text-slate-700 font-bold"
                      >
                        <span className="material-symbols-outlined text-sm text-[#864f19]">support_agent</span>
                        Raise Support Ticket
                      </Link>
                      <hr className="border-slate-100 my-1" />
                      <div className="px-4 py-1 text-[10px] text-slate-400 font-medium leading-relaxed">
                        ConnectPortal Support Desk operates 24/7. Response times average 15 mins.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="h-6 w-px bg-[#d7c3b5]/40 hidden sm:block"></div>
              
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 hover:bg-[#eae8e7]/50 p-1.5 rounded-xl transition cursor-pointer border-none bg-transparent"
                  aria-label="User profile menu"
                >
                  <div className="text-right hidden lg:block text-left">
                    <p className="font-bold text-xs text-[#1b1c1c] leading-none">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-[#52443a] font-semibold mt-1 capitalize">
                      {effectiveRole ? `${effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1)} Agent` : 'Pincode Agent'}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full border-2 border-white shadow-sm bg-[#ffdcc2] text-[#864f19] font-black text-sm flex items-center justify-center uppercase">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#52443a]" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#d7c3b5]/40 rounded-2xl shadow-xl py-2 z-50 text-xs text-left animate-fade-in">
                    <Link
                      to="/shared/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#f6f3f2] text-slate-700 font-bold"
                    >
                      <User className="w-4 h-4 text-[#864f19]" />
                      My Profile
                    </Link>
                    <Link
                      to="/shared/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#f6f3f2] text-slate-700 font-bold"
                    >
                      <Settings className="w-4 h-4 text-[#864f19]" />
                      Account Settings
                    </Link>
                    <hr className="border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 text-red-600 font-bold border-none bg-transparent cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Content Body */}
        <main className="flex-grow p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white h-full shadow-2xl border-r border-[#d7c3b5]/50 p-6 animate-fade-in justify-between">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-[#d7c3b5]/50 pb-4">
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <img src="/logo.jpg" alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
                  <span className="font-black text-sm tracking-wide text-[#864f19]">
                    ConnectPortal
                  </span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="p-1 rounded-lg hover:bg-[#eae8e7] text-[#52443a]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col space-y-1.5">
                {visibleSidebarItems.map((item, idx) => {
                  const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={idx}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-[#864f19] text-white scale-95'
                          : 'text-[#52443a] hover:bg-[#eae8e7]'
                      }`}
                    >
                      <span className="shrink-0 flex items-center">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-[#d7c3b5]/50 pt-4 bg-white">
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-bold text-[#ba1a1a] hover:bg-red-50 rounded-xl transition-colors border border-red-200"
              >
                <span className="material-symbols-outlined mr-2">logout</span> Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
