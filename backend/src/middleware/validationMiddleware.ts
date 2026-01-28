/**
 * Validation Schemas using Zod
 * Centralized input validation for all API endpoints
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ==========================================
// COMMON SCHEMAS
// ==========================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const positiveAmountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .max(1000000000, 'Amount exceeds maximum limit');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .nullable();

export const accountNumberSchema = z
  .string()
  .min(10, 'Account number too short')
  .max(20, 'Account number too long')
  .regex(/^[0-9]+$/, 'Account number must contain only digits');

// ==========================================
// USER SCHEMAS
// ==========================================

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  email: emailSchema,
  password: passwordSchema,
  phone_number: phoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .optional(),
  phone_number: phoneSchema,
  address: z.string().max(500, 'Address too long').optional().nullable(),
  kyc_status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
});

export const updatePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
});

// ==========================================
// ACCOUNT SCHEMAS
// ==========================================

export const createAccountSchema = z.object({
  user_id: uuidSchema,
  account_number: accountNumberSchema,
  account_type: z.enum(['SAVINGS', 'CURRENT']),
  balance: z.number().min(0, 'Initial balance cannot be negative').optional().default(0),
});

export const updateBalanceSchema = z.object({
  balance: z.number().min(0, 'Balance cannot be negative'),
});

export const depositSchema = z.object({
  amount: positiveAmountSchema,
  description: z.string().max(255, 'Description too long').optional(),
});

// ==========================================
// TRANSACTION SCHEMAS
// ==========================================

export const createTransactionSchema = z.object({
  account_id: uuidSchema,
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'LOAN_PAYMENT', 'LOAN_DISBURSAL']),
  amount: positiveAmountSchema,
  description: z.string().max(255, 'Description too long').optional().nullable(),
  category: z.string().max(50, 'Category too long').optional().nullable(),
  counterparty_name: z.string().max(100, 'Counterparty name too long').optional().nullable(),
  counterparty_account_number: z.string().max(20, 'Account number too long').optional().nullable(),
  status: z.enum(['COMPLETED', 'PENDING', 'FAILED']).optional().default('COMPLETED'),
  reference_id: z.string().max(50, 'Reference ID too long').optional().nullable(),
});

export const transferSchema = z.object({
  from_account_id: uuidSchema,
  to_account_number: accountNumberSchema,
  amount: positiveAmountSchema,
  description: z.string().max(255, 'Description too long').optional().default('Transfer'),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must contain only digits').optional(),
  idempotency_key: z.string().max(64, 'Idempotency key too long').optional(),
});

// ==========================================
// CARD SCHEMAS
// ==========================================

export const createCardSchema = z.object({
  account_id: uuidSchema,
  card_holder_name: z
    .string()
    .min(2, 'Cardholder name too short')
    .max(100, 'Cardholder name too long'),
  expiry_date: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry date must be in MM/YY format'),
  daily_limit: z.number().positive().max(100000, 'Daily limit too high').optional().default(1500),
});

export const updateCardSchema = z.object({
  daily_limit: z.number().positive().max(100000, 'Daily limit too high').optional(),
  is_international_enabled: z.boolean().optional(),
  is_online_enabled: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'BLOCKED', 'FROZEN']).optional(),
});

export const updatePinSchema = z.object({
  current_pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
  new_pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
});

// ==========================================
// LOAN SCHEMAS
// ==========================================

export const createLoanSchema = z.object({
  user_id: uuidSchema,
  loan_type: z.enum(['PERSONAL', 'HOME', 'AUTO', 'EDUCATION', 'BUSINESS']),
  loan_amount: positiveAmountSchema,
  interest_rate: z.number().min(0).max(50, 'Interest rate too high'),
  term_months: z.number().int().min(1).max(360, 'Term too long'),
  purpose: z.string().max(500, 'Purpose description too long').optional(),
});

export const updateLoanStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED', 'DEFAULTED']),
  rejection_reason: z.string().max(500, 'Rejection reason too long').optional(),
});

// ==========================================
// SUPPORT TICKET SCHEMAS
// ==========================================

export const createTicketSchema = z.object({
  user_id: uuidSchema,
  subject: z.string().min(5, 'Subject too short').max(200, 'Subject too long'),
  category: z.enum(['FRAUD', 'ACCOUNT', 'TECH', 'LOAN', 'CARD', 'OTHER']),
  description: z.string().min(10, 'Description too short').max(2000, 'Description too long'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
});

export const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigned_to: uuidSchema.optional().nullable(),
  resolution: z.string().max(2000, 'Resolution too long').optional(),
});

// ==========================================
// ML PREDICTION SCHEMAS
// ==========================================

export const fraudPredictionSchema = z.object({
  Amount: positiveAmountSchema.optional(),
  amount: positiveAmountSchema.optional(),
  Time: z.number().optional(),
  is_foreign: z.boolean().optional(),
  merchant_category: z.string().optional(),
}).refine((data: { Amount?: number; amount?: number }) => data.Amount || data.amount, {
  message: 'Amount is required',
});

export const loanPredictionSchema = z.object({
  ApplicantIncome: z.number().min(0, 'Income cannot be negative'),
  CoapplicantIncome: z.number().min(0, 'Income cannot be negative').optional().default(0),
  LoanAmount: positiveAmountSchema,
  Loan_Amount_Term: z.number().int().min(12).max(480).optional().default(360),
  Credit_History: z.number().min(0).max(1).optional().default(1),
  Education: z.enum(['Graduate', 'Not Graduate']).optional(),
  Married: z.enum(['Yes', 'No']).optional(),
  Property_Area: z.enum(['Urban', 'Semiurban', 'Rural']).optional(),
});

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

/**
 * Create validation middleware for a Zod schema
 * @param schema - Zod schema to validate against
 * @param source - Where to get data from (body, query, params)
 */
export const validate = <T extends z.ZodTypeAny>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.errors.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        });
        return;
      }
      
      // Replace request data with validated/transformed data
      req[source] = result.data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Validate UUID in params
 */
export const validateId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    const result = uuidSchema.safeParse(id);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`,
        code: 'INVALID_ID',
      });
      return;
    }
    
    next();
  };
};

export default {
  // Schemas
  uuidSchema,
  emailSchema,
  passwordSchema,
  positiveAmountSchema,
  registerSchema,
  loginSchema,
  updateUserSchema,
  createAccountSchema,
  createTransactionSchema,
  transferSchema,
  createCardSchema,
  updateCardSchema,
  createLoanSchema,
  createTicketSchema,
  fraudPredictionSchema,
  loanPredictionSchema,
  // Middleware
  validate,
  validateId,
};
