/**
 * Middleware Index
 * Central export for all middleware
 */

export {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  rateLimitMiddleware,
  resourceOwnerMiddleware,
} from './authMiddleware';

export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
  requestLogger,
} from './errorMiddleware';

export {
  validate,
  validateId,
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
} from './validationMiddleware';

export {
  authRateLimiter,
  registrationRateLimiter,
  transactionRateLimiter,
  standardRateLimiter,
  readOnlyRateLimiter,
  passwordResetRateLimiter,
  atmCodeRateLimiter,
  mlRateLimiter,
  globalRateLimiter,
} from './rateLimiter';
