/**
 * Utility functions for handling dates that might come from API as strings
 */

export function formatMessageTime(timestamp: Date | string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function formatDate(timestamp: Date | string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

export function formatDateTime(timestamp: Date | string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export function ensureDate(timestamp: Date | string): Date {
  return new Date(timestamp);
}

export function isValidDate(timestamp: Date | string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}
