const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface UsageOverview {
  overview: {
    totalRequests: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
    uniqueUsers: number;
  };
  byModel: Array<{
    model: string;
    requests: number;
    totalTokens: number;
    estimatedCost: number;
  }>;
}

export interface UserUsage {
  userId: string;
  email: string;
  name: string;
  subscriptionTier: string;
  requests: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface UsageByDate {
  date: string;
  requests: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string | null;
  tripCount: number;
  apiRequests: number;
  totalTokens: number;
  estimatedCost: number;
  createdAt: string;
}

/**
 * Get overall usage statistics
 */
export async function getUsageOverview(
  startDate?: string,
  endDate?: string
): Promise<UsageOverview> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const url = `${API_BASE_URL}/api/admin/usage/overview${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch usage overview: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get usage breakdown by user
 */
export async function getUsageByUser(
  limit = 50,
  offset = 0
): Promise<{ users: UserUsage[] }> {
  const url = `${API_BASE_URL}/api/admin/usage/by-user?limit=${limit}&offset=${offset}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch usage by user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get usage over time
 */
export async function getUsageByDate(
  startDate?: string,
  endDate?: string,
  interval: 'day' | 'week' | 'month' = 'day'
): Promise<{ usage: UsageByDate[] }> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('interval', interval);

  const url = `${API_BASE_URL}/api/admin/usage/by-date?${params}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch usage by date: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all users with usage stats
 */
export async function getUsers(
  limit = 50,
  offset = 0,
  search?: string
): Promise<{ users: AdminUser[] }> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (search) params.append('search', search);

  const url = `${API_BASE_URL}/api/admin/users?${params}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }

  return response.json();
}
