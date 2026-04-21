export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  // TODO: Remove this temporary local-dev auth bypass when the login page flow is completed.
  devAuthToken: import.meta.env.VITE_DEV_AUTH_TOKEN,
};
