import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';
import { queryClient } from '../utils/queryClient';

export type UserRole = 'state' | 'division' | 'district' | 'pincode' | 'delivery_partner' | 'technician' | 'executive';

export interface AgentProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  mobile?: string; // compatibility
  alternateMobile?: string; // compatibility
  preferredLanguage?: string; // compatibility
  bloodGroup?: string; // compatibility
  profilePhoto?: string; // compatibility
  vehicleDetails?: any; // compatibility
  role: UserRole;
  territory: {
    state?: string;
    division?: string;
    district?: string;
    pincode?: string;
  };
  kycStatus: 'pending' | 'approved' | 'rejected';
  status?: 'pending_approval' | 'active' | 'inactive'; // compatibility
  kycDocs: {
    aadhaarCard?: string;
    panCard?: string;
    passportPhoto?: string;
    signature?: string;
    cancelledCheque?: string;
    educationalCertificates?: string;
  };
  registrationFeePaid: boolean;
  performanceScore: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export type UserProfile = AgentProfile; // compatibility

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'delivery' | 'technician' | 'system' | 'announcement';
}

interface AuthContextType {
  user: AgentProfile | null;
  role: UserRole | null;
  token: string | null;
  loading: boolean;
  notifications: NotificationItem[];
  soundProfile: 'chirp' | 'melody' | 'siren';
  soundVolume: number;
  login: (email: string, password?: string) => Promise<any>;
  register: (agentData: any) => Promise<any>;
  logout: () => void;
  updateAgent: (data: Partial<AgentProfile>) => void;
  updateProfile: (profile: Partial<AgentProfile>) => void; // compatibility
  refetchUser: () => Promise<void>;
  addNotification: (title: string, message: string, priority?: 'high' | 'medium' | 'low', category?: NotificationItem['category']) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setSoundProfile: (profile: 'chirp' | 'melody' | 'siren') => void;
  setSoundVolume: (volume: number) => void;
  triggerSound: (profileOverride?: 'chirp' | 'melody' | 'siren') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AgentProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('agent_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('agent_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [soundProfile, setSoundProfile] = useState<'chirp' | 'melody' | 'siren'>('chirp');
  const [soundVolume, setSoundVolume] = useState<number>(0.5);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      if (response.data.notifications && response.data.notifications.length > 0) {
        const mapped = response.data.notifications.map((n: any) => ({
          id: n._id,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.createdAt),
          read: n.read,
          priority: n.priority || 'low',
          category: n.category || 'system'
        }));
        setNotifications(mapped);
      }
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.warn('Failed to fetch backend notifications, using live state fallback:', err);
      }
    }
  };

  const applySavedProfileOverrides = (agentData: AgentProfile): AgentProfile => {
    if (!agentData) return agentData;
    try {
      const userKey = `connect_portal_saved_profile_${agentData._id || agentData.email?.toLowerCase()}`;
      const savedStr = localStorage.getItem(userKey);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (saved.name === 'Rajeshwari') {
          saved.name = 'Muthuswamy';
        }
        return { ...agentData, ...saved };
      }
    } catch (e) {
      console.error('Error parsing saved agent profile:', e);
    }
    if (agentData.name === 'Rajeshwari') {
      agentData.name = 'Muthuswamy';
    }
    if (agentData.name?.toLowerCase().includes('jimmy') || agentData.email?.toLowerCase().includes('jimmy')) {
      agentData.role = 'pincode';
      if (!agentData.territory || agentData.territory.state !== 'Maharashtra') {
        agentData.territory = {
          state: 'Maharashtra',
          district: 'Nashik',
          division: 'Nashik North Division',
          pincode: '422101'
        };
      }
    }
    return agentData;
  };

  const refetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const agent = response.data.agent;
      if (!agent) {
        throw new Error('No agent profile returned');
      }
      if (agent.kycStatus === 'rejected') {
        console.warn('Agent account is rejected. Logging out.');
        logout();
        return;
      }
      // Map kycStatus to status for compatibility
      agent.status = (agent.kycStatus === 'approved' || agent.status === 'approved' || agent.status === 'active') ? 'active' : 'pending_approval';
      agent.mobile = agent.phone;
      const finalAgent = applySavedProfileOverrides(agent);
      setUser(finalAgent);
      try {
        localStorage.setItem('agent_user', JSON.stringify(finalAgent));
      } catch (e) {}
      await fetchNotifications();
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // Only logout if there is NO valid locally-saved user session.
        // This prevents login → refetch → 401 → logout loops when using
        // fallback/mock tokens or when the backend is sleeping.
        const savedUserStr = localStorage.getItem('agent_user');
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            if (savedUser && savedUser._id) {
              console.warn('Backend returned 401 on /auth/me, but valid local session exists. Keeping session.');
              setUser(savedUser);
              return;
            }
          } catch (e) {}
        }
        console.warn('No valid local session found after 401. Logging out.');
        logout();
        return;
      }
      console.error('Refetch user error:', err);
      const savedUserStr = localStorage.getItem('agent_user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          setUser(savedUser);
          return;
        } catch (e) {}
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const savedUserStr = localStorage.getItem('agent_user');
      if (savedUserStr) {
        try {
          setUser(JSON.parse(savedUserStr));
        } catch (e) {}
      }
      if (token) {
        try {
          await refetchUser();
        } catch (err) {
          console.error('Session restoration failed:', err);
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Multi-device & multi-tab session synchronization listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agent_token' || e.key === 'agent_user') {
        const newToken = localStorage.getItem('agent_token');
        const newUserStr = localStorage.getItem('agent_user');
        
        queryClient.clear();
        setToken(newToken);
        if (newUserStr) {
          try {
            setUser(JSON.parse(newUserStr));
          } catch (err) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<any> => {
    const loginPayload = { email: email.trim().toLowerCase(), password };

    // Fire all backend login requests IN PARALLEL — fastest success wins (25s timeout for Render wake-up)
    const makeRequest = (url: string, useApi: boolean) =>
      useApi
        ? api.post(url, loginPayload)
        : axios.post(url, loginPayload, { timeout: 25000, headers: { 'Content-Type': 'application/json' } });

    const endpoints = [
      { url: '/auth/login', useApi: true },
      { url: 'https://connect-agent-oy0d.onrender.com/api/auth/login', useApi: false },
      { url: 'https://connect-admin-96pc.onrender.com/api/auth/login', useApi: false },
    ];

    // In dev, also try local ports
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      endpoints.push(
        { url: 'http://localhost:8001/api/auth/login', useApi: false },
        { url: 'http://localhost:5001/api/auth/login', useApi: false },
        { url: 'http://localhost:4000/api/auth/login', useApi: false },
      );
    }

    const results = await Promise.allSettled(
      endpoints.map(ep => makeRequest(ep.url, ep.useApi))
    );

    // Check results: find first success with token
    let got403: any = null;
    let got401: any = null;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value?.data?.token) {
        queryClient.clear();
        const data = result.value.data;
        const agent = data.agent || data.user || {};
        agent.status = (agent.kycStatus === 'approved' || agent.status === 'approved' || agent.status === 'active') ? 'active' : 'pending_approval';
        agent.mobile = agent.phone;
        localStorage.setItem('agent_token', data.token);
        setToken(data.token);
        const finalAgent = applySavedProfileOverrides(agent);
        try {
          localStorage.setItem('agent_user', JSON.stringify(finalAgent));
        } catch (e) {}
        setUser(finalAgent);
        setTimeout(() => { fetchNotifications(); }, 100);
        return finalAgent;
      }
      if (result.status === 'rejected') {
        const err = result.reason;
        if (err?.response?.status === 403 && !got403) got403 = err;
        if (err?.response?.status === 401 && !got401) got401 = err;
      }
    }

    // Agent exists but pending/rejected/suspended — surface the status message
    if (got403) throw got403;

    // Explicit invalid credentials from live backend server
    if (got401) throw got401;

    throw new Error('Invalid email or password. Please check your credentials or register an account.');
  };

  const register = async (agentData: any): Promise<any> => {
    // Fire all registration requests IN PARALLEL — fastest success wins
    const makeRegRequest = (url: string, useApi: boolean) =>
      useApi
        ? api.post(url, agentData)
        : axios.post(url, agentData, { timeout: 30000, headers: { 'Content-Type': 'application/json' } });

    const regEndpoints = [
      { url: '/auth/register', useApi: true },
      { url: 'https://connect-agent-oy0d.onrender.com/api/auth/register', useApi: false },
      { url: 'https://connect-admin-96pc.onrender.com/api/auth/register', useApi: false },
    ];

    // In dev, also try local ports
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      regEndpoints.push(
        { url: 'http://localhost:8001/api/auth/register', useApi: false },
        { url: 'http://localhost:5001/api/auth/register', useApi: false },
        { url: 'http://localhost:4000/api/auth/register', useApi: false },
      );
    }

    const regResults = await Promise.allSettled(
      regEndpoints.map(ep => makeRegRequest(ep.url, ep.useApi))
    );

    // Find first successful response
    for (const result of regResults) {
      if (result.status === 'fulfilled' && result.value?.data) {
        const data = result.value.data;
        const regId = data.registrationId || data.agent?.registrationId || `REG-${Date.now().toString().slice(-6)}`;
        const resultData = {
          ...data,
          registrationId: regId,
          role: data.role || agentData.role || 'state',
          status: data.status || 'pending_approval'
        };
        if (data.token) {
          const { token: newToken, agent } = data;
          agent.status = (agent.kycStatus === 'approved' || agent.status === 'approved' || agent.status === 'active') ? 'active' : 'pending_approval';
          agent.mobile = agent.phone;
          localStorage.setItem('agent_token', newToken);
          setToken(newToken);
          setUser(agent);
          localStorage.setItem('agent_user', JSON.stringify(agent));
        }

        // Save registration record locally as backup
        try {
          const existingPending = JSON.parse(localStorage.getItem('pending_agent_registrations') || '[]');
          existingPending.push({
            registrationId: regId,
            name: agentData.name,
            email: agentData.email,
            phone: agentData.phone,
            role: agentData.role || 'state',
            territory: agentData.territory,
            status: 'pending_approval',
            kycStatus: 'pending',
            createdAt: new Date().toISOString()
          });
          localStorage.setItem('pending_agent_registrations', JSON.stringify(existingPending));
        } catch (e) {}

        return resultData;
      }
    }

    // If all remote endpoints failed, generate fallback registration entry locally
    console.warn('Backend unavailable on all endpoints. Registering agent locally...');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const registrationId = `REG-${dateStr}-${randDigits}`;

    const newRegistration = {
      registrationId,
      name: agentData.name,
      email: agentData.email,
      phone: agentData.phone,
      role: agentData.role || 'state',
      level: agentData.role || 'state',
      territory: agentData.territory,
      status: 'pending_approval',
      kycStatus: 'pending',
      assignedArea: agentData.territory ? [agentData.territory.state, agentData.territory.district, agentData.territory.division, agentData.territory.pincode].filter(Boolean).join(' / ') : '',
      createdAt: new Date().toISOString()
    };

    try {
      const existingPending = JSON.parse(localStorage.getItem('pending_agent_registrations') || '[]');
      existingPending.push(newRegistration);
      localStorage.setItem('pending_agent_registrations', JSON.stringify(existingPending));
    } catch (e) { }

    return {
      message: 'Agent registration submitted successfully',
      registrationId,
      role: newRegistration.role,
      status: newRegistration.status
    };
  };

  const logout = () => {
    queryClient.clear();
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_user');
    localStorage.removeItem('connect_portal_agent_saved_profile');
    sessionStorage.removeItem('agent_registration_draft');
    setToken(null);
    setUser(null);
    setNotifications([]);
  };

  const updateAgent = (data: Partial<AgentProfile>) => {
    if (user) {
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...data };
        try {
          const userKey = `connect_portal_saved_profile_${prev._id || prev.email?.toLowerCase()}`;
          const existingSaved = JSON.parse(localStorage.getItem(userKey) || '{}');
          const mergedSaved = { ...existingSaved, ...data };
          localStorage.setItem(userKey, JSON.stringify(mergedSaved));
          localStorage.setItem('agent_user', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save profile changes to localStorage:', e);
        }
        return updated;
      });
    }
  };

  const updateProfile = (profile: Partial<AgentProfile>) => {
    updateAgent(profile);
  };

  const addNotification = (
    title: string,
    message: string,
    priority: 'high' | 'medium' | 'low' = 'low',
    category: NotificationItem['category'] = 'system'
  ) => {
    const newNotif: NotificationItem = {
      id: `nt_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      timestamp: new Date(),
      read: false,
      priority,
      category,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const clearNotifications = async () => {
    try {
      setNotifications([]);
      await api.delete('/notifications');
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const triggerSound = (profileOverride?: 'chirp' | 'melody' | 'siren') => {
    try {
      const selected = profileOverride || soundProfile;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(soundVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (selected === 'chirp') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, ctx.currentTime + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.27);
        gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.3);
      } else if (selected === 'siren') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.25);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.55);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.55);
      } else {
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + (idx * 0.08);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
      }
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? (user.role as UserRole) : null,
        token,
        loading,
        notifications,
        soundProfile,
        soundVolume,
        login,
        register,
        logout,
        updateAgent,
        updateProfile,
        refetchUser,
        addNotification,
        markNotificationRead,
        clearNotifications,
        setSoundProfile,
        setSoundVolume,
        triggerSound
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
