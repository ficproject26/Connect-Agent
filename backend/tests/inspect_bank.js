const mongoose = require('mongoose');
require('dotenv').config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const withBankUsers = await db.collection('users').find({
    $or: [
      { 'bankDetails.bankName': { $exists: true, $ne: '' } },
      { 'bankDetails.accountNumber': { $exists: true, $ne: '' } },
      { bankName: { $exists: true, $ne: '' } },
      { accountNumber: { $exists: true, $ne: '' } },
      { accountNo: { $exists: true, $ne: '' } }
    ]
  }).project({ name: 1, email: 1, bankDetails: 1, bankName: 1, accountNumber: 1, accountNo: 1, ifscCode: 1 }).toArray();

  console.log('users with bank fields:', withBankUsers.length);
  console.log(withBankUsers.slice(0, 10));

  const agentsWithBank = await db.collection('agents').find({
    $or: [
      { 'bankDetails.bankName': { $exists: true, $ne: '' } },
      { 'bankDetails.accountNumber': { $exists: true, $ne: '' } }
    ]
  }).project({ name: 1, email: 1, bankDetails: 1 }).toArray();

  console.log('agents with bank in agents collection:', agentsWithBank.length);
  console.log(agentsWithBank.slice(0, 10));

  // Also check Wallets collection! Does Wallet collection store bank details or agentId?
  const wallets = await db.collection('wallets').find({}).limit(5).toArray();
  console.log('sample wallets:', wallets);

  await mongoose.disconnect();
}

inspect();
