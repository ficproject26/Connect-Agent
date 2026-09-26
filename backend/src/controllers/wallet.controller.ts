import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Wallet from '../models/Wallet';
import Agent from '../models/Agent';
import { publishEntityEvent } from '../realtime/eventBus';

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

    const cleanAccNo = String(accountNumber).trim();
    if (!/^\d{8,20}$/.test(cleanAccNo)) {
      return res.status(400).json({ message: 'Account number must contain between 8 and 20 numeric digits.' });
    }

    const cleanIfsc = String(ifscCode).toUpperCase().trim();
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(cleanIfsc)) {
      return res.status(400).json({
        message: 'Invalid IFSC code format. Indian IFSC must be 4 uppercase letters, followed by 0, and 6 alphanumeric characters (e.g., SBIN0001428).'
      });
    }

    const updatedBank = {
      bankName: (bankName || 'State Bank of India').trim(),
      accountNumber: cleanAccNo,
      ifscCode: cleanIfsc,
      accountHolder: (holderName || accountHolder || '').trim()
    };

    const updatedAgent = await Agent.findByIdAndUpdate(
      agentId,
      { bankDetails: updatedBank },
      { new: true }
    );

    if (!updatedAgent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Sync bank details to users collection in MongoDB
    try {
      const db = mongoose.connection.db;
      if (db) {
        await db.collection('users').updateOne(
          { $or: [{ email: updatedAgent.email.toLowerCase() }, { phone: updatedAgent.phone }] },
          {
            $set: {
              bankDetails: updatedBank,
              bankName: updatedBank.bankName,
              accountNo: updatedBank.accountNumber,
              accountNumber: updatedBank.accountNumber,
              ifscCode: updatedBank.ifscCode,
              accountHolderName: updatedBank.accountHolder
            }
          }
        );
      }
    } catch (syncErr) {
      console.error('Error syncing bank details to users collection:', syncErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Bank details saved successfully',
      bankDetails: updatedBank,
      data: { bankDetails: updatedBank }
    });
  } catch (error) {
    console.error('Update bank details error:', error);
    return res.status(500).json({ message: 'Internal server error while saving bank details' });
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

    // Publish Realtime Wallet Event
    publishEntityEvent({
      event: 'ENTITY_UPDATED',
      entity: 'wallet',
      entityId: wallet._id.toString(),
      action: 'transacted',
      scope: {
        targetAgentId: agentId
      },
      data: {
        balance: wallet.balance,
        transaction: newTx
      }
    }).catch(() => {});

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

// GET /api/wallet/summary
export const getWalletSummary = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const wallet = await getOrCreateWallet(agentId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Current week starting Monday
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);

    // Current month starting 1st
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    let todayEarnings = 0;
    let weekEarnings = 0;
    let monthEarnings = 0;
    let pendingPayouts = 0;

    for (const tx of wallet.transactions || []) {
      const txDate = new Date(tx.createdAt);
      const isCredit = tx.type === 'credit' && tx.status === 'completed';
      const isPendingDebit = tx.type === 'debit' && tx.status === 'pending';

      if (isCredit) {
        if (txDate >= startOfToday) {
          todayEarnings += tx.amount || 0;
        }
        if (txDate >= startOfWeek) {
          weekEarnings += tx.amount || 0;
        }
        if (txDate >= startOfMonth) {
          monthEarnings += tx.amount || 0;
        }
      }

      if (isPendingDebit) {
        pendingPayouts += tx.amount || 0;
      }
    }

    let nextPayoutDate: string | null = null;
    if (pendingPayouts > 0) {
      const nextPayout = new Date(now);
      const dayOfWeek = nextPayout.getDay();
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
      nextPayout.setDate(nextPayout.getDate() + daysUntilFriday);
      nextPayoutDate = nextPayout.toISOString().split('T')[0];
    }

    return res.status(200).json({
      balance: wallet.balance || 0,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      pendingPayouts,
      nextPayoutDate
    });
  } catch (error) {
    console.error('Get wallet summary error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
