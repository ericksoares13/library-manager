import { notifyDataChanged } from "./changes";

/** Erro HTTP da API, com a mensagem do `ApiError` do back (em inglês) e o status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(error?.message ?? response.statusText, response.status);
  }
  if ((init?.method ?? "GET") !== "GET") {
    notifyDataChanged();
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

/** Opções de uma requisição com corpo JSON. */
export const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});
