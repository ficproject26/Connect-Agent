import { Request, Response } from 'express';
import Wallet from '../models/Wallet';
import Agent from '../models/Agent';

// Helper to generate a transaction ID
const generateTxId = () => `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

const FAKE_DESCRIPTIONS = [
  'Weekly merchant onboarding target completion bonus',
  'Onboarding reward bonus'
];

// Helper to get or create a wallet for an agent with real data isolation
const getOrCreateWallet = async (agentId: string) => {
  let wallet = await Wallet.findOne({ agent: agentId });
  if (!wallet) {
    wallet = new Wallet({
      agent: agentId,
      balance: 0,
      transactions: []
    });
    await wallet.save();
    return wallet;
  }

  // Defensively strip any pre-seeded fake transactions
  const hasFake = (wallet.transactions || []).some(t => FAKE_DESCRIPTIONS.includes(t.description));
  if (hasFake) {
    const realTransactions = wallet.transactions.filter(t => !FAKE_DESCRIPTIONS.includes(t.description));
    const realBalance = realTransactions.reduce((acc, t) => {
      if (t.type === 'credit' && t.status === 'completed') return acc + (t.amount || 0);
      if (t.type === 'debit' && (t.status === 'completed' || t.status === 'pending')) return acc - (t.amount || 0);
      return acc;
    }, 0);

    wallet.transactions = realTransactions as any;
    wallet.balance = Math.max(0, realBalance);
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
    const sortedTx = [...wallet.transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return res.status(200).json({ transactions: sortedTx });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/wallet/bank-details
export const getBankDetails = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const agent = await Agent.findById(agentId);
    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    // Check if agent already has bankDetails populated
    let bankDetails = (agent.bankDetails && (agent.bankDetails.bankName || agent.bankDetails.accountNumber)) ? {
      bankName: agent.bankDetails.bankName,
      accountNumber: agent.bankDetails.accountNumber,
      ifscCode: agent.bankDetails.ifscCode,
      accountHolder: agent.bankDetails.accountHolder || agent.name
    } : null;

    // If not found directly, auto-map from registered/approved user onboarding record
    if (!bankDetails) {
      const UserCol = Agent.db.collection('users');
      const registeredUser = await UserCol.findOne({
        $or: [
          { email: agent.email },
          { phone: agent.phone },
          { mobileNumber: agent.phone },
          { name: agent.name }
        ]
      });

      if (registeredUser && (registeredUser.bankName || registeredUser.accountNo || registeredUser.accountNumber || registeredUser.ifscCode)) {
        bankDetails = {
          bankName: registeredUser.bankName || 'State Bank of India',
          accountNumber: registeredUser.accountNo || registeredUser.accountNumber || '',
          ifscCode: registeredUser.ifscCode || registeredUser.ifsc || '',
          accountHolder: registeredUser.accountHolderName || registeredUser.name || agent.name
        };
        // Persist to agent record so future lookups are instant
        await Agent.findByIdAndUpdate(agentId, { bankDetails });
      }
    }

    return res.status(200).json({
      bankDetails: bankDetails || {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolder: agent.name
      }
    });
  } catch (error) {
    console.error('Get bank details error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/wallet/bank-details
export const updateBankDetails = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { bankName, accountNumber, ifscCode, holderName, accountHolder } = req.body;
    if (!accountNumber || !ifscCode) {
      return res.status(400).json({ message: 'Account number and IFSC code are required' });
    }

    const updatedBank = {
      bankName: (bankName || '').trim(),
      accountNumber: (accountNumber || '').trim(),
      ifscCode: (ifscCode || '').toUpperCase().trim(),
      accountHolder: (holderName || accountHolder || '').trim()
    };

    await Agent.findByIdAndUpdate(
      agentId,
      { bankDetails: updatedBank },
      { new: true }
    );

    return res.status(200).json({
      message: 'Bank details updated successfully',
      bankDetails: updatedBank
    });
  } catch (error) {
    console.error('Update bank details error:', error);
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
