// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = async <T = any>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<{
  status: number;
  data: ({ success: true } & T) | { success: false; error: string };
}> => {
  const API_HOST = import.meta.env.VITE_API_ROOT || "";

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
