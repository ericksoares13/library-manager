/** Uma página da listagem, como a API devolve (`PageResponse` do back). */
export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

/** O que a tela pede: página (a partir de 0), ordenação, texto da busca e filtro (se houver). */
export type PageQuery<S extends string, F extends string = never> = {
  page: number;
  sort: S;
  q: string;
  filter?: F;
};

const PAGE_SIZE = 20;

/** Monta a URL da listagem com os parâmetros da página e os extras da tela (ex.: `status`). */
export function pageUrl<S extends string, F extends string>(
  path: string,
  { page, sort, q }: PageQuery<S, F>,
  extra: Record<string, string | undefined> = {},
) {
  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), sort });
  // Extra sem valor (ex.: sem membro) não entra na URL
  Object.entries(extra).forEach(([name, value]) => value !== undefined && params.set(name, value));
  if (q.trim()) {
    params.set("q", q.trim());
  }
  return `${path}?${params}`;
}
