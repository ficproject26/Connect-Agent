import { Request, Response } from 'express';
/**
 * Resolves the authorized administrator for a submitting agent based on their role and territory:
 * - Pincode Agent -> Pincode Admin for the assigned pincode
 * - Division Agent -> Division Admin for the assigned division
 * - District Agent -> District Admin for the assigned district
 * - State Agent -> State Admin for the assigned state
 */
export declare function resolveAuthorizedAdminForAgent(submittingRole: string, territory: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
}): Promise<any>;
export declare const getTickets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTicketById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTicket: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTicketStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=ticket.controller.d.ts.map