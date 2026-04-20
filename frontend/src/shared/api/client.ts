import { env } from "../config/env";
import type { BaseResponse, ProblemDetail } from "../types/api";
import { CustomClientException } from "./CustomClientException";

type RequestOptions = RequestInit & {
  headers?: HeadersInit;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let errorData: ProblemDetail;
    try {
      errorData = await response.json();
    } catch (e) {
      // Fallback if the body is not JSON
      errorData = {
        type: "about:blank",
        title: "Unknown Error",
        status: response.status,
        detail: `HTTP Error: ${response.status}`,
        instance: path,
        code: "G1000",
      };
    }
    throw new CustomClientException(errorData);
  }

  // Parse success response based on backend BaseResponse<T>
  const jsonResponse = await response.json() as BaseResponse<T>;
  
  // Return the inner data directly for convenience, 
  // frontend APIs don't need to manually unpack .data every time.
  // Note: if the API doesn't wrap in BaseResponse (e.g. 3rd party), 
  // you might need a flag to bypass this.
  return jsonResponse.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
};
