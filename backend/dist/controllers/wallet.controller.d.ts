import { Request, Response } from 'express';
export declare const getBalance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTransactions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBankDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBankDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const requestCashout: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=wallet.controller.d.ts.map