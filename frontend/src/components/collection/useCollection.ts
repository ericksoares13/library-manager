import { useEffect, useState } from "react";
import { onDataChanged } from "../../api/changes";
import type { Page, PageQuery } from "../../api/page";

type FetchPage<T, S extends string, F extends string> = (
  query: PageQuery<S, F>,
  signal: AbortSignal,
) => Promise<Page<T>>;

export type Collection<T, S extends string, F extends string = never> = {
  /** Última página recebida (continua na tela enquanto a próxima carrega, para não piscar). */
  page: Page<T> | null;
  /** Total sem busca no filtro atual (o cabeçalho não muda enquanto se digita). */
  catalogTotal: number | null;
  query: PageQuery<S, F>;
  loading: boolean;
  failed: boolean;
  search: (q: string) => void;
  sortBy: (sort: S) => void;
  filterBy: (filter: F) => void;
  goTo: (page: number) => void;
  /** Busca de novo a página atual (para tentar de novo depois de uma falha). */
  reload: () => void;
};

type Loaded<T> = { key: string; page: Page<T> };

/**
 * Listagem paginada no back: página, ordenação, busca e filtro. Cada mudança cancela o pedido
 * anterior (a resposta antiga não pode sobrescrever a nova) e volta para a primeira página quando
 * a busca, a ordem ou o filtro mudam. Qualquer alteração salva na API (em qualquer tela) busca a
 * página de novo.
 */
export function useCollection<T, S extends string, F extends string = never>(
  fetchPage: FetchPage<T, S, F>,
  defaultSort: S,
  defaultFilter?: F,
): Collection<T, S, F> {
  const [query, setQuery] = useState<PageQuery<S, F>>({
    page: 0,
    sort: defaultSort,
    q: "",
    filter: defaultFilter,
  });
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<{ filter?: F; total: number } | null>(null);

  const reload = () => setVersion((current) => current + 1);

  useEffect(() => onDataChanged(() => setVersion((current) => current + 1)), []);

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
          setCatalog({ filter: query.filter, total: result.totalItems });
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
    // Total de outro filtro (trocou o filtro durante uma busca) não vale para o atual
    catalogTotal: catalog && catalog.filter === query.filter ? catalog.total : null,
    query,
    loading: !failed && loaded?.key !== key,
    failed,
    search: (q) => setQuery((current) => ({ ...current, q, page: 0 })),
    sortBy: (sort) => setQuery((current) => ({ ...current, sort, page: 0 })),
    filterBy: (filter) => setQuery((current) => ({ ...current, filter, page: 0 })),
    goTo: (page) => setQuery((current) => ({ ...current, page })),
    reload,
  };
}
