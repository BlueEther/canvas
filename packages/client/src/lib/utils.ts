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

export type EnforceObjectType<T> = <V extends { [k: string]: T }>(
  v: V
) => { [k in keyof V]: T };
