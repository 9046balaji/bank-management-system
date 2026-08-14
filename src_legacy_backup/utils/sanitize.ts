/**
 * Input Sanitization Utilities
 * Prevents XSS attacks by sanitizing user input
 */

// Characters that could be used in XSS attacks
const DANGEROUS_CHARS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// Regular expressions for detecting malicious content
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_REGEX = /\s*on\w+\s*=/gi;
const JAVASCRIPT_REGEX = /javascript:/gi;
const DATA_REGEX = /data:/gi;
const EXPRESSION_REGEX = /expression\s*\(/gi;

/**
 * Basic HTML entity encoding
 * Escapes characters that could be used in XSS
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  return text.replace(/[&<>"'`=\/]/g, (char) => DANGEROUS_CHARS[char] || char);
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

/**
 * Remove potentially dangerous patterns from text
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  let sanitized = text;
  
  // Remove script tags
  sanitized = sanitized.replace(SCRIPT_REGEX, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(EVENT_HANDLER_REGEX, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(JAVASCRIPT_REGEX, '');
  
  // Remove data: URLs (could contain scripts)
  sanitized = sanitized.replace(DATA_REGEX, '');
  
  // Remove CSS expressions
  sanitized = sanitized.replace(EXPRESSION_REGEX, '');
  
  // Escape remaining HTML entities
  return escapeHtml(sanitized);
}

/**
 * Sanitize input for safe display
 * Use this for user-generated content like:
 * - Transaction descriptions
 * - Support ticket messages
 * - User names
 * - Addresses
 */
export function sanitizeForDisplay(input: string | null | undefined): string {
  if (!input) return '';
  return sanitizeText(stripHtml(input)).trim();
}

/**
 * Sanitize a URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  const trimmed = url.trim().toLowerCase();
  
  // Only allow http, https, and relative URLs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  ) {
    return url;
  }
  
  // Reject dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }
  
  // For other URLs, assume it needs https://
  return `https://${url}`;
}

/**
 * Validate and sanitize an email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    return '';
  }
  
  return escapeHtml(trimmed);
}

/**
 * Sanitize a phone number (keep only digits and + for country code)
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Keep only digits, +, and spaces
  return phone.replace(/[^\d+\s-]/g, '').trim();
}

/**
 * Sanitize a number input (remove non-numeric characters except decimal point)
 */
export function sanitizeNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  
  // Keep only digits and decimal point
  const cleaned = input.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  const sanitized = parts.length > 2 
    ? `${parts[0]}.${parts.slice(1).join('')}`
    : cleaned;
  
  const num = parseFloat(sanitized);
  return isNaN(num) ? null : num;
}

/**
 * Sanitize an account number (keep only digits)
 */
export function sanitizeAccountNumber(account: string | null | undefined): string {
  if (!account) return '';
  return account.replace(/\D/g, '');
}

/**
 * Create a safe string for use in HTML attributes
 */
export function sanitizeAttribute(value: string | null | undefined): string {
  if (!value) return '';
  return escapeHtml(value).replace(/[\n\r]/g, ' ').trim();
}

/**
 * Sanitize JSON data before displaying
 */
export function sanitizeJson(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    return sanitizeForDisplay(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeJson);
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[sanitizeForDisplay(key)] = sanitizeJson(value);
    }
    return sanitized;
  }
  
  return data;
}

export default {
  escapeHtml,
  stripHtml,
  sanitizeText,
  sanitizeForDisplay,
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeAccountNumber,
  sanitizeAttribute,
  sanitizeJson,
};
