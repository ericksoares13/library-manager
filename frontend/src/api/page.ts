/** Uma página da listagem, como a API devolve (`PageResponse` do back). */
export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

/** O que a tela pede: página (a partir de 0), ordenação e texto da busca. */
export type PageQuery<S extends string> = {
  page: number;
  sort: S;
  q: string;
};

const PAGE_SIZE = 20;

/** Monta a URL da listagem com os parâmetros da página. */
export function pageUrl<S extends string>(path: string, { page, sort, q }: PageQuery<S>) {
  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), sort });
  if (q.trim()) {
    params.set("q", q.trim());
  }
  return `${path}?${params}`;
}
