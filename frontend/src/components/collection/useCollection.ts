import { useEffect, useState } from "react";
import type { Page, PageQuery } from "../../api/page";

type FetchPage<T, S extends string> = (
  query: PageQuery<S>,
  signal: AbortSignal,
) => Promise<Page<T>>;

export type Collection<T, S extends string> = {
  /** Última página recebida (continua na tela enquanto a próxima carrega, para não piscar). */
  page: Page<T> | null;
  /** Total do acervo sem busca (o cabeçalho não muda enquanto se digita). */
  catalogTotal: number | null;
  query: PageQuery<S>;
  loading: boolean;
  failed: boolean;
  search: (q: string) => void;
  sortBy: (sort: S) => void;
  goTo: (page: number) => void;
  /** Busca de novo a página atual (depois de salvar ou excluir, ou para tentar de novo). */
  reload: () => void;
};

type Loaded<T> = { key: string; page: Page<T> };

/**
 * Listagem paginada no back: página, ordenação e busca. Cada mudança cancela o pedido anterior
 * (a resposta antiga não pode sobrescrever a nova) e volta para a primeira página quando a busca
 * ou a ordem mudam.
 */
export function useCollection<T, S extends string>(
  fetchPage: FetchPage<T, S>,
  defaultSort: S,
): Collection<T, S> {
  const [query, setQuery] = useState<PageQuery<S>>({ page: 0, sort: defaultSort, q: "" });
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null);

  // Identifica o pedido: o estado de "carregando" sai da comparação, sem setState no efeito
  const key = JSON.stringify([query, version]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPage(query, controller.signal).then(
      (result) => {
        // A página ficou vazia (ex.: excluiu o último item dela): vai para a última que existe
        if (result.items.length === 0 && query.page > 0 && result.totalPages > 0) {
          setQuery((current) => ({ ...current, page: result.totalPages - 1 }));
          return;
        }
        setLoaded({ key, page: result });
        if (!query.q.trim()) {
          setCatalogTotal(result.totalItems);
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setFailedKey(key);
        }
      },
    );
    return () => controller.abort();
  }, [fetchPage, query, key]);

  const failed = failedKey === key;

  return {
    page: loaded?.page ?? null,
    catalogTotal,
    query,
    loading: !failed && loaded?.key !== key,
    failed,
    search: (q) => setQuery((current) => ({ ...current, q, page: 0 })),
    sortBy: (sort) => setQuery((current) => ({ ...current, sort, page: 0 })),
    goTo: (page) => setQuery((current) => ({ ...current, page })),
    reload: () => setVersion((current) => current + 1),
  };
}
