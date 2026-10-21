import mongoose from 'mongoose';
import Notification, { INotification } from '../models/Notification';
import { publishEntityEvent } from '../realtime/eventBus';

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

export class NotificationService {
  /**
   * Create a persistent notification for a specific recipient, preventing duplicates.
   */
  static async createNotification(params: CreateNotificationParams): Promise<INotification | null> {
    try {
      if (!params.receiver || !params.title || !params.message) return null;

      // Duplicate prevention: If an unread notification with the same receiver, category, and relatedEntityId exists within 24h, skip
      if (params.relatedEntityId) {
        const existing = await Notification.findOne({
          receiver: params.receiver,
          category: params.category,
          relatedEntityId: params.relatedEntityId,
          read: false
        }).lean();

        if (existing) {
          return null; // Prevent duplicate dispatch
        }
      }

      const doc = await Notification.create({
        receiver: params.receiver,
        title: params.title.trim(),
        message: params.message.trim(),
        priority: params.priority || 'medium',
        category: params.category,
        link: params.link || '',
        relatedEntityId: params.relatedEntityId || '',
        relatedEntityType: params.relatedEntityType || '',
        metadata: params.metadata || {},
        read: false,
        createdAt: new Date()
      });

      // Emit realtime event if eventBus is connected
      publishEntityEvent({
        event: 'ENTITY_CREATED',
        entity: 'notification',
        entityId: doc._id.toString(),
        action: 'created',
        data: doc
      }).catch(() => {});

      return doc;
    } catch (err) {
      console.error('Failed to create notification:', err);
      return null;
    }
  }

  /**
   * Task Assignment Notification for the receiving Agent.
   * Ensures tasks assigned to Managers do not produce notifications for Agents.
   */
  static async notifyTaskAssignment(task: any, recipientId: any): Promise<void> {
    if (!recipientId || !task) return;

    // Check if task is assigned to a manager
    if (task.assignedManagerId || (task.assignedAgentRole && /manager/i.test(task.assignedAgentRole))) {
      return; // Do not notify agents of manager tasks
    }

    const territory = [task.state, task.district, task.division, task.pincode ? `PIN ${task.pincode}` : ''].filter(Boolean).join(' › ');
    const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A';
    const priority = (task.priority || '').toLowerCase() === 'high' ? 'high' : ((task.priority || '').toLowerCase() === 'low' ? 'low' : 'medium');

    await this.createNotification({
      receiver: recipientId,
      title: `Task Assigned: ${task.title || 'New Task'}`,
      message: `[${task.taskNumber || 'TSK'}] Priority: ${task.priority || 'Medium'} • Due: ${dueDateStr} • Scope: ${territory}`,
      priority,
      category: 'task_assigned',
      link: '/tasks',
      relatedEntityId: String(task._id || task.taskNumber),
      relatedEntityType: 'task',
      metadata: {
        taskId: String(task._id || ''),
        taskNumber: task.taskNumber,
        priority: task.priority,
        dueDate: task.dueDate,
        territory
      }
    });
  }

  /**
   * Task Status Update Notification (e.g. Approved, Rework, Rejected).
   */
  static async notifyTaskStatusChange(task: any, recipientId: any, action: string, remarks?: string): Promise<void> {
    if (!recipientId || !task) return;

    const priority = (task.priority || '').toLowerCase() === 'high' ? 'high' : 'medium';

    await this.createNotification({
      receiver: recipientId,
      title: `Task ${action}: ${task.title || task.taskNumber}`,
      message: `[${task.taskNumber}] Status is now "${task.status}".${remarks ? ' Note: ' + remarks : ''}`,
      priority,
      category: 'task_status',
      link: '/tasks',
      relatedEntityId: `${String(task._id || task.taskNumber)}_${action.toLowerCase().replace(/\s+/g, '_')}`,
      relatedEntityType: 'task',
      metadata: {
        taskId: String(task._id || ''),
        taskNumber: task.taskNumber,
        status: task.status,
        remarks
      }
    });
  }

  /**
   * Vendor Onboarding Notification for authorized territory Agent.
   */
  static async notifyVendorOnboarding(vendor: any, recipientId: any): Promise<void> {
    if (!recipientId || !vendor) return;

    const vendorName = vendor.businessName || vendor.ownerName || 'New Merchant';
    const territory = [vendor.state, vendor.district, vendor.division, vendor.pincode ? `PIN ${vendor.pincode}` : ''].filter(Boolean).join(' › ');

    await this.createNotification({
      receiver: recipientId,
      title: `Vendor Onboarding: ${vendorName}`,
      message: `"${vendorName}" registered in ${territory}. Status: ${vendor.status || 'Active'} (KYC: ${vendor.kycStatus || 'Pending'}).`,
      priority: 'medium',
      category: 'vendor_onboarded',
      link: '/vendors',
      relatedEntityId: String(vendor._id || vendor.registrationId || vendorName),
      relatedEntityType: 'vendor',
      metadata: {
        vendorId: String(vendor._id || ''),
        businessName: vendorName,
        pincode: vendor.pincode,
        status: vendor.status,
        kycStatus: vendor.kycStatus
      }
    });
  }

  /**
   * KYC Status Update Notification.
   */
  static async notifyKycStatusChange(vendor: any, recipientId: any, newStatus: string, remarks?: string): Promise<void> {
    if (!recipientId || !vendor) return;

    const vendorName = vendor.businessName || vendor.ownerName || 'Merchant';
    const isApproved = /approved|verified/i.test(newStatus);

    await this.createNotification({
      receiver: recipientId,
      title: `KYC ${isApproved ? 'Approved' : 'Updated'}: ${vendorName}`,
      message: `KYC verification for "${vendorName}" has been updated to "${newStatus}".${remarks ? ' Remarks: ' + remarks : ''}`,
      priority: isApproved ? 'medium' : 'high',
      category: 'kyc_status',
      link: '/vendors',
      relatedEntityId: `${String(vendor._id || vendorName)}_kyc_${newStatus.toLowerCase()}`,
      relatedEntityType: 'vendor',
      metadata: {
        vendorId: String(vendor._id || ''),
        businessName: vendorName,
        kycStatus: newStatus,
        remarks
      }
    });
  }

  /**
   * Ticket Status Update Notification.
   */
  static async notifyTicketUpdate(ticket: any, recipientId: any, action: string, remarks?: string): Promise<void> {
    if (!recipientId || !ticket) return;

    await this.createNotification({
      receiver: recipientId,
      title: `Support Ticket ${ticket.ticketId || 'Update'}: ${action}`,
      message: `Ticket ${ticket.ticketId} (${ticket.category || 'Support'}) is now ${ticket.status}.${remarks ? ' Response: ' + remarks : ''}`,
      priority: ticket.priority === 'high' ? 'high' : 'medium',
      category: 'ticket_assigned',
      link: '/tickets',
      relatedEntityId: `${String(ticket._id || ticket.ticketId)}_${action.toLowerCase().replace(/\s+/g, '_')}`,
      relatedEntityType: 'ticket',
      metadata: {
        ticketId: ticket.ticketId,
        status: ticket.status
      }
    });
  }

  /**
   * Sync active task & onboarding dispatches for the authenticated agent
   * to ensure no relevant tasks or changes are missing from the alerts view.
   */
  static async syncAgentEvents(agentId: any, agentRole?: string, territory?: any): Promise<void> {
    try {
      if (!agentId) return;
      const db = mongoose.connection.db;
      if (!db) return;

      const agentQueryVals: any[] = [agentId, String(agentId)];
      if (mongoose.Types.ObjectId.isValid(agentId)) {
        agentQueryVals.push(new mongoose.Types.ObjectId(agentId));
      }

      // 1. Sync tasks assigned directly to this Agent
      const activeTasks = await db.collection('tasks').find({
        assignedAgentId: { $in: agentQueryVals },
        status: { $in: ['Assigned', 'In Progress', 'Rework', 'Submitted for Review'] }
      }).limit(10).toArray();

      for (const t of activeTasks) {
        // Exclude manager tasks
        if (t.assignedManagerId || (t.assignedAgentRole && /manager/i.test(t.assignedAgentRole))) continue;
        await this.notifyTaskAssignment(t, agentId);
      }

      // 2. Sync recently assigned active vendors for this Agent
      const activeVendors = await db.collection('vendors').find({
        $or: [
          { assignedAgent: { $in: agentQueryVals } },
          { agentId: { $in: agentQueryVals } },
          { onboardedBy: { $in: agentQueryVals } }
        ],
        status: { $in: ['active', 'Active', 'approved', 'Approved'] }
      }).limit(5).toArray();

      for (const v of activeVendors) {
        await this.notifyVendorOnboarding(v, agentId);
      }
    } catch (syncErr) {
      console.warn('Sync agent events warning:', syncErr);
    }
  }
}

export default NotificationService;
