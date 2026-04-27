const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

const resolveApiBaseUrl = () => {
  if (!rawApiBaseUrl || typeof window === 'undefined') {
    return rawApiBaseUrl;
  }

  try {
    if (new URL(rawApiBaseUrl).origin === window.location.origin) {
      return "";
    }
  } catch {
    return rawApiBaseUrl.replace(/\/+$/, "");
  }

  return rawApiBaseUrl.replace(/\/+$/, "");
};

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  cdnUrl: import.meta.env.VITE_CDN_URL ?? "https://djbod0nv85jx9.cloudfront.net",
};
