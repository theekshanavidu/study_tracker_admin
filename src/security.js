/**
 * Security & Sanitization Utilities for Admin Console
 */

export function sanitizeInput(input) {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') {
    if (typeof input === 'number' || typeof input === 'boolean') return input;
    input = String(input);
  }
  let clean = input.replace(/\0/g, '');
  clean = clean.replace(/<\s*(script|iframe|object|embed|style|meta|link|base|applet|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  clean = clean.replace(/<\s*(script|iframe|object|embed|style|meta|link|base|applet|form)[^>]*\/?>/gi, '');
  clean = clean.replace(/\bon[a-z]{3,20}\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\bon[a-z]{3,20}\s*=\s*[^>\s]+/gi, '');
  clean = clean.replace(/javascript\s*:/gi, 'blocked:');
  clean = clean.replace(/vbscript\s*:/gi, 'blocked:');
  return escapeHTML(clean);
}

export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;');
}

export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (/^(javascript|vbscript|data\s*:\s*text\/html|file):/i.test(trimmed)) {
    return '#';
  }
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
    return trimmed.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/.test(trimmed)) {
    return `https://${trimmed}`.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  return '#';
}

