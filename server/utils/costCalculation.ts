/**
 * OpenAI API Pricing (as of January 2025)
 * Prices are per 1M tokens
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-3.5-turbo': {
    input: 0.50, // $0.50 per 1M input tokens
    output: 1.50, // $1.50 per 1M output tokens
  },
  'gpt-4o': {
    input: 2.50, // $2.50 per 1M input tokens
    output: 10.00, // $10.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.00, // $10.00 per 1M input tokens
    output: 30.00, // $30.00 per 1M output tokens
  },
  'gpt-4': {
    input: 30.00, // $30.00 per 1M input tokens
    output: 60.00, // $60.00 per 1M output tokens
  },
};

/**
 * Calculate estimated cost for an API call in USD cents
 * @param model - The OpenAI model used
 * @param promptTokens - Number of input/prompt tokens
 * @param completionTokens - Number of output/completion tokens
 * @returns Estimated cost in USD cents (e.g., 0.05 means $0.0005)
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model];

  // Default to gpt-3.5-turbo pricing if model not found
  if (!pricing) {
    console.warn(`Unknown model: ${model}, using gpt-3.5-turbo pricing`);
    const defaultPricing = MODEL_PRICING['gpt-3.5-turbo'];
    const inputCost = (promptTokens / 1_000_000) * defaultPricing.input;
    const outputCost = (completionTokens / 1_000_000) * defaultPricing.output;
    return (inputCost + outputCost) * 100; // Convert to cents
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  // Return cost in cents (multiply by 100)
  // This allows storing costs as Float in database while maintaining precision
  return (inputCost + outputCost) * 100;
}

/**
 * Format cost in cents to readable USD string
 * @param costInCents - Cost in cents (e.g., 0.05)
 * @returns Formatted string (e.g., "$0.0005")
 */
export function formatCost(costInCents: number): string {
  const dollars = costInCents / 100;
  return `$${dollars.toFixed(4)}`;
}
