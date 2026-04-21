import { env } from "../config/env";
import type { BaseResponse, ProblemDetail } from "../types/api";
import { CustomClientException } from "./CustomClientException";
import { getAccessToken } from "./tokenStorage";

type RequestOptions = RequestInit & {
  headers?: HeadersInit;
};

/**
 * 백엔드 에러 응답을 프론트에서 쓰는 하나의 에러 형태로 변환한다.
 *
 * 현재 백엔드는 두 가지 에러 응답 형태를 줄 수 있다.
 * - ProblemDetail: { status, title, detail, code, ... }
 * - BaseResponse.fail: { code, message }
 */
function toProblemDetail(path: string, status: number, body: unknown): ProblemDetail {
  if (body && typeof body === "object") {
    const data = body as Partial<ProblemDetail> & Partial<BaseResponse<unknown>>;

    // 이미 ProblemDetail 형태인 응답은 그대로 사용한다.
    if (typeof data.status === "number" && typeof data.title === "string") {
      return data as ProblemDetail;
    }

    // BaseResponse.fail(code, message) 형태를 ProblemDetail 형태로 맞춘다.
    if (typeof data.code === "string" || typeof data.message === "string") {
      return {
        type: "about:blank",
        title: data.message ?? "Request failed",
        status,
        detail: data.message ?? `HTTP Error: ${status}`,
        instance: path,
        code: data.code ?? "G1000",
      };
    }
  }

  // JSON이 아니거나 예상하지 못한 에러 응답일 때의 fallback이다.
  return {
    type: "about:blank",
    title: "Unknown Error",
    status,
    detail: `HTTP Error: ${status}`,
    instance: path,
    code: "G1000",
  };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // TODO: 로그인 페이지 흐름이 완성되면 env.devAuthToken 제거.
  // 지금은 실제 로그인이 없어서 로컬 스토리 개발용 고정 우회 토큰을 사용한다.
  const accessToken = env.devAuthToken ?? getAccessToken();

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // 인증이 필요한 API를 위해 JWT를 Authorization 헤더에 붙인다.
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch (e) {
      // 프록시 에러나 서버 기본 에러처럼 JSON이 아닌 응답도 있을 수 있다.
      errorBody = null;
    }

    throw new CustomClientException(toProblemDetail(path, response.status, errorBody));
  }

  // 백엔드 성공 응답은 BaseResponse<T>로 감싸져 있다.
  const jsonResponse = await response.json() as BaseResponse<T>;

  // API 모듈에서는 wrapper가 아니라 실제 payload만 받도록 data만 꺼낸다.
  return jsonResponse.data;
}

export const apiClient = {
  // T는 BaseResponse<T>가 아니라 data 안에 들어있는 실제 응답 타입이다.
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  // JSON body 직렬화는 여기에서 한 번만 처리한다.
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
};
