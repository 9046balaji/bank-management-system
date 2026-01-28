/**
 * Data Masking Utilities
 * Masks sensitive data for display in the UI
 */

/**
 * Mask an account number, showing only last 4 digits
 * @example maskAccountNumber('1234567890') => '******7890'
 */
export function maskAccountNumber(account: string | null | undefined): string {
  if (!account || account.length < 4) return '****';
  const lastFour = account.slice(-4);
  const masked = '*'.repeat(Math.max(0, account.length - 4));
  return `${masked}${lastFour}`;
}

/**
 * Mask a card number, showing only last 4 digits with spaces
 * @example maskCardNumber('4111111111111234') => '**** **** **** 1234'
 */
export function maskCardNumber(cardNumber: string | null | undefined): string {
  if (!cardNumber) return '**** **** **** ****';
  
  // Remove any existing spaces or dashes
  const clean = cardNumber.replace(/[\s-]/g, '');
  
  if (clean.length < 4) return '**** **** **** ****';
  
  const lastFour = clean.slice(-4);
  return `**** **** **** ${lastFour}`;
}

/**
 * Mask a phone number, showing only last 4 digits
 * @example maskPhoneNumber('+1234567890') => '***-***-7890'
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '***-***-****';
  
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 4) return '***-***-****';
  
  const lastFour = digits.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * Mask an email address
 * @example maskEmail('john.doe@example.com') => 'j*****e@example.com'
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '****@****.***';
  
  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  
  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const masked = '*'.repeat(Math.min(5, localPart.length - 2));
  
  return `${firstChar}${masked}${lastChar}@${domain}`;
}

/**
 * Mask a name, showing only first and last initials
 * @example maskName('John Doe') => 'J*** D**'
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return '****';
  
  const parts = name.trim().split(/\s+/);
  
  return parts.map(part => {
    if (part.length <= 1) return part;
    return `${part[0]}${'*'.repeat(part.length - 1)}`;
  }).join(' ');
}

/**
 * Mask a CVV (always show as ***)
 */
export function maskCvv(): string {
  return '***';
}

/**
 * Mask an IFSC code, showing only first 4 characters
 * @example maskIfsc('HDFC0001234') => 'HDFC*******'
 */
export function maskIfsc(ifsc: string | null | undefined): string {
  if (!ifsc || ifsc.length < 4) return '***********';
  return `${ifsc.slice(0, 4)}${'*'.repeat(ifsc.length - 4)}`;
}

/**
 * Mask an amount for display (useful for hiding balances)
 * @example maskAmount(12345.67) => '₹*****'
 */
export function maskAmount(amount: number | null | undefined, currency: string = '₹'): string {
  if (amount === null || amount === undefined) return `${currency}****`;
  
  // Convert to string and mask all but pattern
  const amountStr = amount.toFixed(2);
  return `${currency}${'*'.repeat(amountStr.length)}`;
}

/**
 * Format and optionally mask a monetary amount
 * @param amount - The amount to format
 * @param currency - Currency symbol
 * @param shouldMask - Whether to mask the amount
 */
export function formatAmount(
  amount: number | null | undefined,
  currency: string = '₹',
  shouldMask: boolean = false
): string {
  if (amount === null || amount === undefined) return `${currency}0.00`;
  
  if (shouldMask) {
    return maskAmount(amount, currency);
  }
  
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Truncate text with ellipsis
 * @example truncateText('Very long description', 10) => 'Very lo...'
 */
export function truncateText(text: string | null | undefined, maxLength: number = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export default {
  maskAccountNumber,
  maskCardNumber,
  maskPhoneNumber,
  maskEmail,
  maskName,
  maskCvv,
  maskIfsc,
  maskAmount,
  formatAmount,
  truncateText,
};
