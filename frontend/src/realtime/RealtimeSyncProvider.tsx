import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { queryClient } from '../utils/queryClient';
import realtimeClient, { ConnectionStatus, RealtimeEvent } from './realtimeClient';

interface RealtimeContextType {
  status: ConnectionStatus;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  status: 'DISCONNECTED',
  reconnect: () => {}
});

export const RealtimeSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, addNotification, triggerSound, refetchUser } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>(realtimeClient.getStatus());

  // 1. Maintain WebSocket connection synced with user authentication
  useEffect(() => {
    if (token) {
      realtimeClient.connect(token);
    } else {
      realtimeClient.disconnect();
    }

    const unsubStatus = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubStatus();
    };
  }, [token]);

  // 2. Global Event-Driven State Synchronizer
  useEffect(() => {
    const unsubEvents = realtimeClient.onAny((event: RealtimeEvent) => {
      const { entity, action } = event;

      // Smart Targeted Query Invalidation based on entity type
      switch (entity) {
        case 'vendor':
          queryClient.invalidateQueries({ queryKey: ['liveVendorsBackend'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['stateDashboardVendors'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['pincodeDashboardStats'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['leaderboard'], refetchType: 'active' });
          break;

        case 'agent':
          queryClient.invalidateQueries({ queryKey: ['agentHierarchy'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['stateDashboardHierarchy'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['districtSubordinates'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['divisionSubordinates'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['adminRegistrations'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['subordinatesAttendanceLive'], refetchType: 'active' });

          // If current agent's own profile or KYC status was updated, refetch user session
          if (user && (event.entityId === user._id || event.scope?.targetAgentId === user._id)) {
            refetchUser().catch(() => {});
          }
          break;

        case 'target':
          queryClient.invalidateQueries({ queryKey: ['targetAssignmentsMine'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['targetSubordinates'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['pincodeDashboardStats'], refetchType: 'active' });
          break;

        case 'wallet':
          queryClient.invalidateQueries({ queryKey: ['walletDetailsLive'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['walletSummary'], refetchType: 'active' });
          break;

        case 'ticket':
          queryClient.invalidateQueries({ queryKey: ['ticketsListLive'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['pincodeUserTickets'], refetchType: 'active' });
          break;

        case 'attendance':
          queryClient.invalidateQueries({ queryKey: ['myAttendanceLive'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['subordinatesAttendanceLive'], refetchType: 'active' });
          break;

        case 'fieldVisit':
          queryClient.invalidateQueries({ queryKey: ['fieldVisitsLive'], refetchType: 'active' });
          break;

        case 'report':
          queryClient.invalidateQueries({ queryKey: ['submittedReportsLive'], refetchType: 'active' });
          break;

        case 'notification':
          if (event.data) {
            addNotification(
              event.data.title || 'System Notification',
              event.data.message || 'New update available',
              event.data.priority || 'medium',
              event.data.category || 'system'
            );
            triggerSound('chirp');
          }
          break;

        default:
          // Fallback: Invalidate queries matching entity name prefix
          queryClient.invalidateQueries({ queryKey: [entity], refetchType: 'active' });
          break;
      }
    });

    // 3. Listen for reconnection sync event to reconcile offline changes
    const handleReconnectedSync = () => {
      console.log('[RealtimeSyncProvider] Reconnected: Refreshing active queries...');
      queryClient.invalidateQueries({ refetchType: 'active' });
    };

    window.addEventListener('connect:realtime:sync', handleReconnectedSync);

    return () => {
      unsubEvents();
      window.removeEventListener('connect:realtime:sync', handleReconnectedSync);
    };
  }, [user, addNotification, triggerSound, refetchUser]);

  return (
    <RealtimeContext.Provider
      value={{
        status,
        reconnect: () => realtimeClient.reconnect()
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeStatus = () => useContext(RealtimeContext);
export default RealtimeSyncProvider;
