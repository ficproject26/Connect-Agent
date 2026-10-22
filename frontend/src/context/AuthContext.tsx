import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
    postOffice?: string;
    taluk?: string;
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
  category: 'delivery' | 'technician' | 'system' | 'announcement' | 'task' | 'vendor' | 'kyc' | 'ticket';
  link?: string;
  status?: string;
  metadata?: any;
}

interface AuthContextType {
  user: AgentProfile | null;
  role: UserRole | null;
  token: string | null;
  loading: boolean;
  notifications: NotificationItem[];
  fetchNotifications: () => Promise<void>;
  soundProfile: 'chirp' | 'melody' | 'siren';
  soundVolume: number;
  login: (email: string, password?: string) => Promise<any>;
  loginWithToken: (token: string, agent: AgentProfile) => void;
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

export const isAgentApproved = (agent: any): boolean => {
  if (!agent) return false;
  const kyc = String(agent.kycStatus || '').trim().toLowerCase();
  const st = String(agent.status || '').trim().toLowerCase();

  // Explicit rejection or revocation/suspension takes absolute precedence
  if (kyc === 'rejected' || st === 'rejected' || st === 'suspended' || st === 'inactive' || st === 'revoked' || st === 'deleted' || kyc === 'revoked') {
    return false;
  }

  const hasApprovedKyc = kyc === 'approved' || kyc === 'verified';
  const hasApprovedStatus = st === 'approved' || st === 'active';
  const flagApproved = agent.isApproved === true || agent.isActive === true;

  const isPending = kyc === 'pending' || kyc === 'pending_verification' || st === 'pending' || st === 'pending_approval' || st === 'pending_sub_admin_approval';

  if (isPending && !hasApprovedKyc && !hasApprovedStatus && !flagApproved) {
    return false;
  }

  return hasApprovedKyc || hasApprovedStatus || flagApproved;
};

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
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('agent_token');
    } catch (e) {
      return false;
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [soundProfile, setSoundProfile] = useState<'chirp' | 'melody' | 'siren'>('chirp');
  const [soundVolume, setSoundVolume] = useState<number>(0.5);

  const logout = useCallback(() => {
    queryClient.clear();
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_user');
    localStorage.removeItem('connect_portal_agent_saved_profile');
    sessionStorage.removeItem('agent_registration_draft');
    setToken(null);
    setUser(null);
    setNotifications([]);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications', { timeout: 8000 });
      const notifs = response.data?.notifications || [];
      const mapped = notifs.map((n: any) => ({
        id: n._id,
        title: n.title,
        message: n.message,
        timestamp: new Date(n.createdAt),
        read: n.read,
        priority: n.priority || 'low',
        category: n.category || 'system',
        link: n.link || n.metadata?.link,
        status: n.status || n.metadata?.status,
        metadata: n.metadata
      }));
      setNotifications(mapped);
    } catch (err: any) {
      if (err?.response?.status !== 401 && err?.code !== 'ECONNABORTED' && !err?.message?.includes('timeout')) {
        console.warn('Failed to fetch backend notifications:', err);
      }
    }
  }, []);

  const applySavedProfileOverrides = (agentData: AgentProfile): AgentProfile => {
    if (!agentData) return agentData;
    try {
      const userKey = `connect_portal_saved_profile_${agentData._id || agentData.email?.toLowerCase()}`;
      const savedStr = localStorage.getItem(userKey);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        // Authoritative security rule: Never allow client-side saved drafts to override server-persisted approval status, KYC status, role, or identity
        const {
          status,
          kycStatus,
          isApproved,
          isActive,
          role,
          _id,
          email,
          rejectionReason,
          registrationId,
          ...safeOverrides
        } = saved;
        return { ...agentData, ...safeOverrides };
      }
    } catch (e) {
      console.error('Error parsing saved agent profile:', e);
    }
    return agentData;
  };

  const refetchUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const agent = response.data.agent;
      if (!agent) {
        throw new Error('No agent profile returned');
      }

      const approved = isAgentApproved(agent);
      const st = String(agent.status || '').trim().toLowerCase();
      const kyc = String(agent.kycStatus || '').trim().toLowerCase();

      const isRevokedOrSuspended = st === 'suspended' || st === 'inactive' || st === 'revoked' || st === 'deleted' || kyc === 'revoked';
      const isRejected = kyc === 'rejected' || st === 'rejected';

      if (isRevokedOrSuspended || isRejected) {
        console.warn('Agent account is suspended, revoked, or rejected. Logging out.');
        logout();
        return;
      }

      // Authoritative status normalization: If approved, ensure active/approved status
      agent.status = approved ? 'active' : 'pending_approval';
      agent.kycStatus = approved ? 'approved' : (agent.kycStatus || 'pending');
      agent.mobile = agent.phone;
      if (!agent.alternateMobile && (agent.altPhone || agent.alternativePhone || agent.secondaryPhone)) {
        agent.alternateMobile = agent.altPhone || agent.alternativePhone || agent.secondaryPhone;
      }
      const finalAgent = applySavedProfileOverrides(agent);
      setUser(finalAgent);
      try {
        localStorage.setItem('agent_user', JSON.stringify(finalAgent));
      } catch (e) {}
      // Fetch notifications in background without blocking session verification
      fetchNotifications().catch(() => {});
    } catch (err: any) {
      console.warn('Backend session verification failed on /auth/me:', err?.response?.data?.message || err.message);
      const status = err?.response?.status;
      const serverStatus = err?.response?.data?.status;

      // Only force logout on genuine authentication rejection (401 invalid token, 403 account suspended/rejected/revoked)
      if (status === 401 || (status === 403 && (serverStatus === 'suspended' || serverStatus === 'rejected' || serverStatus === 'revoked'))) {
        logout();
      } else if (status === 403 && serverStatus === 'pending') {
        // Genuinely pending approval - reflect pending status without clearing token
        setUser((prev) => {
          if (!prev) return null;
          const updated = { ...prev, status: 'pending_approval' as const, kycStatus: 'pending' as const };
          try { localStorage.setItem('agent_user', JSON.stringify(updated)); } catch (_) {}
          return updated;
        });
      }
      // On network errors (status undefined, ERR_NETWORK, timeout, 500, etc.), do NOT logout and do NOT overwrite status! Keep current cached user!
    }
  }, [logout, fetchNotifications]);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('agent_token');
      if (savedToken) {
        try {
          await refetchUser();
        } catch (err) {
          console.error('Session restoration failed:', err);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    initializeAuth();

    // Multi-device & multi-tab session synchronization listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agent_token' || e.key === 'agent_user') {
        const newToken = localStorage.getItem('agent_token');
        const newUserStr = localStorage.getItem('agent_user');
        
        if (!newToken) {
          queryClient.clear();
          setUser(null);
          setToken(null);
        } else {
          setToken(newToken);
          if (newUserStr) {
            try {
              setUser(JSON.parse(newUserStr));
            } catch (err) {
              setUser(null);
            }
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silent background notification auto-refresh (every 45s, visibility-aware)
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications().catch(() => {});
      }
    }, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, fetchNotifications]);

  const login = useCallback(async (email: string, password: string): Promise<any> => {
    const loginPayload = { email: email.trim().toLowerCase(), password };

    try {
      const response = await api.post('/auth/login', loginPayload);
      if (response?.data?.token) {
        const data = response.data;
        const agent = data.agent || data.user || {};
        const approved = isAgentApproved(agent);
        agent.status = approved ? 'active' : 'pending_approval';
        if (approved) {
          agent.kycStatus = 'approved';
        }
        agent.mobile = agent.phone;
        if (!agent.alternateMobile && (agent.altPhone || agent.alternativePhone || agent.secondaryPhone)) {
          agent.alternateMobile = agent.altPhone || agent.alternativePhone || agent.secondaryPhone;
        }
        localStorage.setItem('agent_token', data.token);
        setToken(data.token);
        const finalAgent = applySavedProfileOverrides(agent);
        try {
          localStorage.setItem('agent_user', JSON.stringify(finalAgent));
        } catch (e) {}
        setUser(finalAgent);
        setLoading(false);
        // Non-blocking background notification refresh
        fetchNotifications().catch(() => {});
        return finalAgent;
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.msg || err?.message || 'Invalid email or password. Please check your credentials or register an account.';
      throw new Error(msg);
    }

    throw new Error('Invalid email or password. Please check your credentials or register an account.');
  }, [fetchNotifications]);

  /**
   * loginWithToken – used by Mobile OTP flow after the backend verifies the OTP
   * and returns a pre-authenticated token + agent object. Sets up the auth session
   * identically to the email login flow without making another API call.
   */
  const loginWithToken = useCallback((newToken: string, agentData: AgentProfile) => {
    const agent = { ...agentData };
    const approved = isAgentApproved(agent);
    agent.status = approved ? 'active' as any : 'pending_approval' as any;
    if (approved) {
      agent.kycStatus = 'approved' as any;
    }
    agent.mobile = agent.phone;
    localStorage.setItem('agent_token', newToken);
    setToken(newToken);
    const finalAgent = applySavedProfileOverrides(agent);
    try { localStorage.setItem('agent_user', JSON.stringify(finalAgent)); } catch (e) {}
    setUser(finalAgent);
    setLoading(false);
    fetchNotifications().catch(() => {});
  }, [fetchNotifications]);

  const register = useCallback(async (agentData: any): Promise<any> => {
    try {
      const response = await api.post('/auth/register', agentData);
      if (response?.data) {
        const data = response.data;
        const regId = data.registrationId || data.agent?.registrationId || `REG-${Date.now().toString().slice(-6)}`;
        const resultData = {
          ...data,
          registrationId: regId,
          role: data.role || agentData.role || 'state',
          status: data.status || 'pending_approval'
        };
        if (data.token) {
          const { token: newToken, agent } = data;
          const approved = isAgentApproved(agent);
          agent.status = approved ? 'active' : 'pending_approval';
          if (approved) {
            agent.kycStatus = 'approved';
          }
          agent.mobile = agent.phone;
          localStorage.setItem('agent_token', newToken);
          setToken(newToken);
          setUser(agent);
          localStorage.setItem('agent_user', JSON.stringify(agent));
        }

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
    } catch (err: any) {
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const msgs = (err.response.data.errors as any[]).map((e: any) => e.message || String(e)).join('. ');
        throw new Error(msgs);
      }
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      if (err?.response?.data?.msg) {
        throw new Error(err.response.data.msg);
      }
      if (err?.response?.status) {
        throw new Error(`Registration failed (HTTP ${err.response.status}). Please check your details and try again.`);
      }
      throw err;
    }

    throw new Error('Unexpected registration state. Please try again.');
  }, []);

  const updateAgent = useCallback((data: Partial<AgentProfile>) => {
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
  }, []);

  const updateProfile = useCallback((profile: Partial<AgentProfile>) => {
    updateAgent(profile);
  }, [updateAgent]);

  const addNotification = useCallback((
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
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    try {
      setNotifications([]);
      await api.delete('/notifications');
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }, []);

  const triggerSound = useCallback((profileOverride?: 'chirp' | 'melody' | 'siren') => {
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
  }, [soundProfile, soundVolume]);

  const effectiveRole = useMemo(() => (user ? (user.role as UserRole) : null), [user?.role]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    role: effectiveRole,
    token,
    loading,
    notifications,
    fetchNotifications,
    soundProfile,
    soundVolume,
    login,
    loginWithToken,
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
  }), [
    user,
    effectiveRole,
    token,
    loading,
    notifications,
    fetchNotifications,
    soundProfile,
    soundVolume,
    login,
    loginWithToken,
    register,
    logout,
    updateAgent,
    updateProfile,
    refetchUser,
    addNotification,
    markNotificationRead,
    clearNotifications,
    triggerSound
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
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
