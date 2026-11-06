import { vi } from "vitest";

export type Route = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  status?: number;
  body?: unknown;
};

// Rota sem "?" vale para qualquer parâmetro (a listagem paginada manda page, sort e q)
const matches = (route: Route, url: string) =>
  route.url.includes("?") ? route.url === url : route.url === url.split("?")[0];

/** Substitui o fetch: cada rota responde sempre igual; chamada sem rota falha o teste. */
export function mockApi(...routes: Route[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const url = String(input);
    const route = routes.find((r) => r.method === method && matches(r, url));
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

/** Página da API com os itens dados (uma página só, a menos que `total` diga outra coisa). */
export function page<T>(items: T[], { page = 0, total = items.length } = {}) {
  return { items, page, size: 20, totalItems: total, totalPages: Math.ceil(total / 20) };
}

/** Parâmetros da última listagem pedida em `path` (ex.: `{ page: "1", sort: "TITLE" }`). */
export function lastListParams(fetchMock: ReturnType<typeof mockApi>, path: string) {
  const urls = fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.split("?")[0] === path);
  if (urls.length === 0) {
    throw new Error(`No list request sent to ${path}`);
  }
  return Object.fromEntries(new URL(urls.at(-1)!, "http://localhost").searchParams);
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
