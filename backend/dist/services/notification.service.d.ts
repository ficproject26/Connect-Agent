import { INotification } from '../models/Notification';
export interface CreateNotificationParams {
    receiver: any;
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high';
    category: string;
    link?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
    metadata?: Record<string, any>;
}
export declare class NotificationService {
    /**
     * Create a persistent notification for a specific recipient, preventing duplicates.
     */
    static createNotification(params: CreateNotificationParams): Promise<INotification | null>;
    /**
     * Task Assignment Notification for the receiving Agent.
     * Ensures tasks assigned to Managers do not produce notifications for Agents.
     */
    static notifyTaskAssignment(task: any, recipientId: any): Promise<void>;
    /**
     * Task Status Update Notification (e.g. Approved, Rework, Rejected).
     */
    static notifyTaskStatusChange(task: any, recipientId: any, action: string, remarks?: string): Promise<void>;
    /**
     * Vendor Onboarding Notification for authorized territory Agent.
     */
    static notifyVendorOnboarding(vendor: any, recipientId: any): Promise<void>;
    /**
     * KYC Status Update Notification.
     */
    static notifyKycStatusChange(vendor: any, recipientId: any, newStatus: string, remarks?: string): Promise<void>;
    /**
     * Ticket Status Update Notification.
     */
    static notifyTicketUpdate(ticket: any, recipientId: any, action: string, remarks?: string): Promise<void>;
    /**
     * Sync active task & onboarding dispatches for the authenticated agent
     * to ensure no relevant tasks or changes are missing from the alerts view.
     */
    static syncAgentEvents(agentId: any, agentRole?: string, territory?: any): Promise<void>;
}
export default NotificationService;
//# sourceMappingURL=notification.service.d.ts.map