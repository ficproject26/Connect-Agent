import { Request, Response } from 'express';
import Wallet from '../models/Wallet';

// Helper to generate a transaction ID
const generateTxId = () => `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// Helper to get or create a wallet for an agent
const getOrCreateWallet = async (agentId: string) => {
  let wallet = await Wallet.findOne({ agent: agentId });
  if (!wallet) {
    // Let's seed a new wallet with ₹5,000 balance and some initial credit transactions so they see data
    wallet = new Wallet({
      agent: agentId,
      balance: 5000,
      transactions: [
        {
          transactionId: generateTxId(),
          amount: 3000,
          type: 'credit',
          description: 'Weekly merchant onboarding target completion bonus',
          status: 'completed',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          transactionId: generateTxId(),
          amount: 2000,
          type: 'credit',
          description: 'Onboarding reward bonus',
          status: 'completed',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        }
      ]
    });
    await wallet.save();
  }
  return wallet;
};

// GET /api/wallet/balance
export const getBalance = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const wallet = await getOrCreateWallet(agentId);
    return res.status(200).json({ balance: wallet.balance });
  } catch (error) {
    console.error('Get balance error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/wallet/transactions
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const wallet = await getOrCreateWallet(agentId);
    
    // Sort transactions by date descending
    const sortedTx = [...wallet.transactions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return res.status(200).json({ transactions: sortedTx });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/wallet/cashout
export const requestCashout = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const wallet = await getOrCreateWallet(agentId);

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Deduct balance and insert debit transaction
    wallet.balance -= amount;
    const newTx = {
      transactionId: generateTxId(),
      amount,
      type: 'debit' as const,
      description: 'Payout cashout request to bank account',
      status: 'pending' as const,
      createdAt: new Date()
    };
    
    wallet.transactions.push(newTx);
    await wallet.save();

    return res.status(200).json({
      message: 'Payout request submitted successfully',
      balance: wallet.balance,
      transaction: newTx
    });
  } catch (error) {
    console.error('Cashout request error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
