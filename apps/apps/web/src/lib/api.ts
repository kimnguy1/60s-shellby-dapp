import type {
  FeedResponse,
  UploadVideoInput,
  UploadVideoResponse,
  WalletConnectResponse,
  WalletProfile
} from "@/types/airdrop";

const requestTimeoutMs = 8_000;
const transientRetryDelayMs = 300;
const missingApiBaseMessage =
  "Missing NEXT_PUBLIC_API_BASE_URL. Set it to the deployed backend API base URL before running the web app.";

function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured && configured.length > 0) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8787";
  }

  return "";
}

function backendUnavailableMessage(apiBase: string): string {
  return `Cannot reach backend API at ${apiBase}. Start or restart the API service, then retry.`;
}

function backendTimeoutMessage(apiBase: string): string {
  return `Backend API timed out at ${apiBase}. Check API health/network, then retry.`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

type RequestOptions = {
  retries?: number;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

function parseApiErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = payload.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit, options?: RequestOptions): Promise<T> {
  const apiBase = resolveApiBase();
  if (apiBase.length === 0) {
    throw new ApiError(missingApiBaseMessage, 500, path);
  }

  const retries = options?.retries ?? 0;
  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": crypto.randomUUID(),
          ...(init?.headers ?? {})
        },
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = parseApiErrorMessage(payload, `API request failed with ${response.status}`);
        const apiError = new ApiError(message, response.status, path);
        const canRetry = response.status >= 500 && attempt < retries;
        if (canRetry) {
          attempt += 1;
          await wait(transientRetryDelayMs * attempt);
          continue;
        }
        throw apiError;
      }

      return (await response.json()) as T;
    } catch (error) {
      const canRetry = attempt < retries && !(error instanceof ApiError) && !isAbortError(error);
      if (canRetry) {
        attempt += 1;
        await wait(transientRetryDelayMs * attempt);
        continue;
      }
      if (isAbortError(error)) {
        throw new ApiError(backendTimeoutMessage(apiBase), 408, path);
      }
      if (isNetworkError(error)) {
        throw new ApiError(backendUnavailableMessage(apiBase), 503, path);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unexpected API client error");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("API retry loop exited unexpectedly");
}

export function connectWallet(walletAddress: string, displayName?: string): Promise<WalletConnectResponse> {
  return request<WalletConnectResponse>("/api/wallet/connect", {
    method: "POST",
    body: JSON.stringify({ walletAddress, displayName })
  });
}

export function getFeed(): Promise<FeedResponse> {
  return request<FeedResponse>("/api/feed", undefined, { retries: 1 });
}

export function getProfile(walletAddress: string): Promise<WalletProfile> {
  return request<WalletProfile>(`/api/profile/${walletAddress}`);
}

export function uploadVideo(input: UploadVideoInput): Promise<UploadVideoResponse> {
  return request<UploadVideoResponse>("/api/videos/upload", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function likeVideo(videoId: string, walletAddress: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/videos/${videoId}/like`, {
    method: "POST",
    body: JSON.stringify({ walletAddress })
  });
}

export function commentVideo(videoId: string, walletAddress: string, content: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/videos/${videoId}/comment`, {
    method: "POST",
    body: JSON.stringify({ walletAddress, content })
  });
}

export function donateVideo(videoId: string, walletAddress: string, amount: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/videos/${videoId}/donate`, {
    method: "POST",
    body: JSON.stringify({ walletAddress, amount })
  });
}

export function downloadVideo(videoId: string, walletAddress: string): Promise<{ url: string }> {
  return request<{ url: string }>(`/api/videos/${videoId}/download`, {
    method: "POST",
    body: JSON.stringify({ walletAddress })
  });
}
