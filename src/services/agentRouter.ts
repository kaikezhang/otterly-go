import { AgentType, AgentContext } from '../types';

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
