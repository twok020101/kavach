import type { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

/**
 * Calls the Kavach API and validates the response with a schema from @kavach/schemas.
 * Pass `token` (a Firebase ID token) once sign-in is wired.
 */
export async function api<S extends z.ZodType>(
  path: string,
  schema: S,
  init: RequestInit & { token?: string; json?: unknown } = {},
): Promise<z.infer<S>> {
  const { token, json, headers, ...rest } = init;
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(response.status, body);
  return schema.parse(body);
}

export const apiUrl = API_URL;

/** The message the API sent with an error, if any, so screens can say what went wrong. */
export function apiMessage(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const body = error.body as { message?: unknown } | null;
  return typeof body?.message === 'string' ? body.message : undefined;
}
