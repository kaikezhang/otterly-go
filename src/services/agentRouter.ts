import type { AgentType, AgentContext, SearchCriteria } from '../types';

const BOOKING_KEYWORDS = [
  'book flight',
  'find flight',
  'search flight',
  'fly to',
  'flight to',
  'book ticket',
  'plane ticket',
  'airline',
  'flights',
];

const EXIT_KEYWORDS = [
  'exit booking',
  'stop booking',
  'back to planning',
  'cancel booking',
  'go back',
  'return to trip',
];

export function routeMessage(
  message: string,
  currentContext: AgentContext
): AgentType {
  const lowerMessage = message.toLowerCase();

  // Check for explicit exit
  if (EXIT_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return 'planning';
  }

  // Check for booking intent
  if (BOOKING_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return 'booking';
  }

  // Stay in current mode if already in booking
  if (currentContext.agent === 'booking') {
    return 'booking';
  }

  return 'planning';
}

export function isBookingIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return BOOKING_KEYWORDS.some((kw) => lowerMessage.includes(kw));
}

export function isExitBooking(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return EXIT_KEYWORDS.some((kw) => lowerMessage.includes(kw));
}

export function extractFlightCriteria(message: string): Partial<SearchCriteria> | null {
  const criteria: Partial<SearchCriteria> = {};

  // Extract cities/airports (simplified - use a proper parser in production)
  const fromMatch = message.match(/from\s+([A-Z]{3})/i);
  const toMatch = message.match(/to\s+([A-Z]{3})/i);

  if (fromMatch) criteria.origin = fromMatch[1].toUpperCase();
  if (toMatch) criteria.destination = toMatch[1].toUpperCase();

  // Extract dates (simplified)
  const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) criteria.departDate = dateMatch[1];

  return Object.keys(criteria).length > 0 ? criteria : null;
}
