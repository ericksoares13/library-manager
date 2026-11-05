import { vi } from "vitest";

export type Route = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  status?: number;
  body?: unknown;
};

/** Substitui o fetch: cada rota responde sempre igual; chamada sem rota falha o teste. */
export function mockApi(...routes: Route[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const url = String(input);
    const route = routes.find((r) => r.method === method && r.url === url);
    if (!route) {
      throw new Error(`Unexpected request: ${method} ${url}`);
    }
    const body = route.body === undefined ? null : JSON.stringify(route.body);
    return new Response(body, {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Corpo JSON enviado na chamada `method url` (falha se ela não aconteceu). */
export function sentBody(fetchMock: ReturnType<typeof mockApi>, method: string, url: string) {
  const call = fetchMock.mock.calls.find(
    ([input, init]) => String(input) === url && (init?.method ?? "GET") === method,
  );
  if (!call) {
    throw new Error(`Request not sent: ${method} ${url}`);
  }
  return JSON.parse(String(call[1]?.body));
}
