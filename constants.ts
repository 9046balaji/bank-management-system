
import { UserRole, UserState } from './types';

export const INITIAL_STATE: UserState = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  phone: "+1 (555) 123-4567",
  accountNumber: "9876543210",
  balance: 145000,
  role: UserRole.USER,
  avatar: "https://picsum.photos/seed/alex/200",
  isKycCompleted: true,
  transactions: [
    { id: 'tx1', type: 'DEPOSIT', amount: 5000, description: 'HDFC Deposit', date: '2023-10-24T10:23:00', status: 'COMPLETED' },
    { id: 'tx2', type: 'WITHDRAWAL', amount: 2000, description: 'ATM Withdrawal', date: '2023-10-23T18:45:00', status: 'COMPLETED' },
    { id: 'tx3', type: 'TRANSFER', amount: 1299, description: 'Amazon India', date: '2023-10-23T12:30:00', status: 'COMPLETED' },
    { id: 'tx4', type: 'LOAN_PAYMENT', amount: 450, description: 'Personal Loan EMI', date: '2023-10-15T09:00:00', status: 'COMPLETED' },
    { id: 'tx5', type: 'TRANSFER', amount: 600, description: 'Concinaction', date: '2023-10-14T11:15:00', status: 'PENDING' },
    { id: 'tx6', type: 'TRANSFER', amount: 45.90, description: 'Uber Rides', date: '2023-10-14T08:30:00', status: 'COMPLETED' },
    { id: 'tx7', type: 'WITHDRAWAL', amount: 100, description: 'ATM Withdrawal', date: '2023-10-12T19:20:00', status: 'COMPLETED' },
  ],
  loans: [
    {
      id: 'L-8839',
      type: 'Personal Loan',
      amount: 12450,
      remaining: 8200,
      interestRate: 8.5,
      termMonths: 36,
      startDate: '2023-01-01',
      nextEmiDate: '2023-11-15',
      emiAmount: 450,
      status: 'ACTIVE'
    }
  ],
  tickets: [
    { id: 'TK-1024', subject: 'Double charge on coffee', category: 'FRAUD', description: 'I was charged twice at Starbucks.', status: 'OPEN', createdAt: '2023-10-24' },
    { id: 'TK-0998', subject: 'Address Update', category: 'ACCOUNT', description: 'Moved to SF.', status: 'IN_PROGRESS', createdAt: '2023-10-20' },
  ],
  notificationPreferences: {
    email: { largeTransaction: true, lowBalance: true, security: true },
    sms: { largeTransaction: true, lowBalance: false, security: true },
    push: { largeTransaction: false, lowBalance: true, security: true },
  },
  settings: {
    maintenanceMode: false,
    currency: 'USD',
    savingsRate: 2.5,
    fdRate: 4.75,
    cardFrozen: false,
    onlinePayments: true,
    intlUse: true,
    dailyLimit: 1500,
  }
};
