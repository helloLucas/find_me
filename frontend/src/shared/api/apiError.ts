import axios from 'axios';

export function isConnectionError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  return !error.response || Boolean(status && status >= 500 && status < 600);
}
