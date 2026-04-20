// Base Response structure (Success)
export interface BaseResponse<T> {
  code: string | null;
  message: string;
  data: T;
}

// RFC 9457 Problem Details structure (Error)
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  errors?: Record<string, any>[]; // Optional validation errors
}
