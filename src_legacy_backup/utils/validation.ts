/**
 * Client-Side Validation Schemas
 * Matches backend Zod validation for consistent validation
 */

import { z } from 'zod';

// ==========================================
// COMMON SCHEMAS
// ==========================================

export const uuidSchema = z.string().uuid('Invalid ID format');

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const positiveAmountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .max(10000000, 'Amount exceeds maximum limit');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .nullable();

export const accountNumberSchema = z
  .string()
  .min(10, 'Account number is too short')
  .max(20, 'Account number is too long')
  .regex(/^[0-9]+$/, 'Account number must contain only digits');

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  phone_number: phoneSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

// ==========================================
// TRANSFER SCHEMAS
// ==========================================

export const internalTransferSchema = z.object({
  fromAccountId: uuidSchema,
  toAccountNumber: accountNumberSchema,
  amount: positiveAmountSchema,
  description: z.string().max(255, 'Description is too long').optional(),
});

export const externalTransferSchema = z.object({
  fromAccountId: uuidSchema,
  beneficiaryName: z.string().min(2, 'Beneficiary name is required').max(100),
  beneficiaryAccount: accountNumberSchema,
  beneficiaryBank: z.string().min(2, 'Bank name is required').max(100),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
  amount: positiveAmountSchema,
  transferType: z.enum(['IMPS', 'NEFT']),
  description: z.string().max(255).optional(),
});

// ==========================================
// ACCOUNT SCHEMAS
// ==========================================

export const depositSchema = z.object({
  amount: positiveAmountSchema,
  description: z.string().max(255, 'Description is too long').optional(),
});

export const withdrawalSchema = z.object({
  amount: positiveAmountSchema,
  description: z.string().max(255, 'Description is too long').optional(),
});

// ==========================================
// LOAN SCHEMAS
// ==========================================

export const loanApplicationSchema = z.object({
  loanType: z.enum(['Personal', 'Home', 'Auto', 'Education', 'Business']),
  amount: z
    .number()
    .min(10000, 'Minimum loan amount is ₹10,000')
    .max(10000000, 'Maximum loan amount is ₹1,00,00,000'),
  termMonths: z
    .number()
    .min(6, 'Minimum term is 6 months')
    .max(360, 'Maximum term is 360 months'),
  purpose: z.string().min(10, 'Please provide more details').max(500),
  monthlyIncome: z.number().min(10000, 'Minimum income requirement not met'),
});

// ==========================================
// CARD SCHEMAS
// ==========================================

export const cardSettingsSchema = z.object({
  dailyLimit: z
    .number()
    .min(100, 'Minimum daily limit is ₹100')
    .max(100000, 'Maximum daily limit is ₹1,00,000'),
  isInternationalEnabled: z.boolean(),
  isOnlineEnabled: z.boolean(),
});

export const cardApplicationSchema = z.object({
  cardType: z.enum(['DEBIT', 'CREDIT']),
  accountId: uuidSchema,
  requestedLimit: z.number().min(10000).max(500000).optional(),
});

// ==========================================
// SUPPORT SCHEMAS
// ==========================================

export const supportTicketSchema = z.object({
  category: z.enum(['FRAUD', 'ACCOUNT', 'TECH', 'OTHER']),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject is too long'),
  description: z
    .string()
    .min(20, 'Please provide more details')
    .max(2000, 'Description is too long'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

// ==========================================
// PROFILE SCHEMAS
// ==========================================

export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .optional(),
  phone_number: phoneSchema,
  address: z.string().max(500, 'Address is too long').optional(),
});

export const kycSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone_number: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  address: z.string().min(10, 'Address is too short').max(500),
  dateOfBirth: z.string().refine((date) => {
    const dob = new Date(date);
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 18;
  }, 'You must be at least 18 years old'),
  idType: z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'VOTER_ID']),
  idNumber: z.string().min(8).max(20),
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Validate data against a schema and return formatted errors
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  
  for (const error of result.error.issues) {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = error.message;
    }
  }
  
  return { success: false, errors };
}

/**
 * Get the first error message for a field
 */
export function getFieldError(
  errors: Record<string, string> | null | undefined,
  field: string
): string | undefined {
  return errors?.[field];
}

/**
 * Check if a field has an error
 */
export function hasFieldError(
  errors: Record<string, string> | null | undefined,
  field: string
): boolean {
  return !!errors?.[field];
}

export default {
  // Auth
  loginSchema,
  registerSchema,
  updatePasswordSchema,
  
  // Transfers
  internalTransferSchema,
  externalTransferSchema,
  depositSchema,
  withdrawalSchema,
  
  // Loans
  loanApplicationSchema,
  
  // Cards
  cardSettingsSchema,
  cardApplicationSchema,
  
  // Support
  supportTicketSchema,
  
  // Profile
  profileUpdateSchema,
  kycSchema,
  
  // Helpers
  validateForm,
  getFieldError,
  hasFieldError,
};
