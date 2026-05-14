"use client";

import { useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";

type ToastType = "success" | "error" | "info";

type UseApiMutationOptions = {
  toast?: (message: string, type?: ToastType) => void;
};

type JsonMutationOptions<TData = unknown> = {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  successMessage?: string;
  errorMessage?: string;
  rollback?: () => void;
  onSuccess?: (data: TData | null, response: Response) => void;
  onError?: (error: unknown) => void;
};

export function useApiMutation({ toast }: UseApiMutationOptions = {}) {
  const mutateJson = useCallback(
    async <TData = unknown>(
      url: string,
      {
        method = "PATCH",
        body,
        successMessage,
        errorMessage = "Changes not saved.",
        rollback,
        onSuccess,
        onError,
      }: JsonMutationOptions<TData> = {},
    ): Promise<TData | null> => {
      try {
        const response = await apiFetch(url, {
          method,
          headers: body === undefined ? undefined : { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });

        if (!response.ok) {
          rollback?.();
          toast?.(errorMessage, "error");
          onError?.(response);
          return null;
        }

        const data = await response
          .clone()
          .json()
          .catch(() => null) as TData | null;
        if (successMessage) toast?.(successMessage, "success");
        onSuccess?.(data, response);
        return data;
      } catch (error) {
        rollback?.();
        toast?.("Network error. Changes not saved.", "error");
        onError?.(error);
        return null;
      }
    },
    [toast],
  );

  return { mutateJson };
}
