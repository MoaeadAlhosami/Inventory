import axios from 'axios';

export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  if (!error.response) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  const data = error.response.data as { message?: string; errors?: Record<string, string[]> } | undefined;

  // Laravel validation errors: show every field message, not just the summary.
  if (data?.errors) {
    const messages = Object.values(data.errors).flat();
    if (messages.length > 0) return messages.join('\n');
  }

  return data?.message || `${fallback} (HTTP ${error.response.status})`;
}
