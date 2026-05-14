import { apiFetch } from "@/lib/api-fetch";

interface ApiEnvelope<TData> {
  data?: TData;
  error?: {
    message?: string;
  };
  message?: string;
}

interface CampaignJsonRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  fallbackError?: string;
}

export async function getCampaignErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response
    .clone()
    .json()
    .catch(() => null) as ApiEnvelope<unknown> | null;

  return body?.error?.message ?? body?.message ?? fallback;
}

export async function campaignJsonRequest<TData = unknown>(
  url: string,
  {
    method = "GET",
    body,
    fallbackError = "Campaign action failed",
  }: CampaignJsonRequestOptions = {},
): Promise<ApiEnvelope<TData>> {
  let response: Response;

  try {
    response = await apiFetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Network error. Please try again.");
  }

  if (!response.ok) {
    throw new Error(await getCampaignErrorMessage(response, fallbackError));
  }

  return response.json().catch(() => ({})) as Promise<ApiEnvelope<TData>>;
}
