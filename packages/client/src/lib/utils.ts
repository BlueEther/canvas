import { toast } from "react-toastify";
import { Renderer } from "./renderer";
import { Debug } from "@sc07-canvas/lib/src/debug";

let _renderer: Renderer;

/**
 * Get the renderer instance or create one
 * @returns
 */
export const getRenderer = (): Renderer => {
  if (_renderer) return _renderer;

  _renderer = Renderer.create();
  return _renderer;
};

Debug._getRenderer = getRenderer;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = async <T = unknown, Error = string>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<{
  status: number;
  data: ({ success: true } & T) | { success: false; error: Error };
}> => {
  const API_HOST = import.meta.env.VITE_API_HOST || "";

  const req = await fetch(API_HOST + endpoint, {
    method,
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: JSON.stringify(body),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any;

  try {
    data = await req.json();
  } catch (e) {
    /* empty */
  }

  return {
    status: req.status,
    data,
  };
};

export type PickMatching<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

export type ExtractMethods<T> = PickMatching<T, Function>;

export type EnforceObjectType<T> = <V extends { [k: string]: T }>(
  v: V
) => { [k in keyof V]: T };

export const handleError = (api_response: Awaited<ReturnType<typeof api>>) => {
  toast.error(
    `Error: [${api_response.status}] ` +
      ("error" in api_response.data ? api_response.data.error : "Unknown Error")
  );
};
