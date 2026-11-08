import type { ComponentType, ReactNode, SVGProps } from "react";
import { AddIcon, SearchIcon } from "../icons";
import { Pagination } from "./Pagination";
import { SortMenu, type SortOption } from "./SortMenu";
import type { Collection } from "./useCollection";

export type { SortOption };

type Props<T, S extends string, F extends string> = {
  collection: Collection<T, S, F>;
  /** Título da tela e nome acessível da lista ("Livros"). */
  title: string;
  /** Linha abaixo do título, a partir do total sem busca ("101 livros no acervo"). */
  countLabel: (total: number, filter: F | undefined) => string;
  /** Texto do botão de adicionar (padrão "Adicionar"). */
  addLabel?: string;
  sortOptions: SortOption<S>[];
  /** Filtro numa seção do menu de ordenação (ex.: situação dos empréstimos). */
  filter?: { label: string; options: SortOption<F>[] };
  search: { label: string; placeholder: string };
  messages: {
    loading: string;
    loadError: string;
    emptyTitle: string;
    emptyText: string;
    notFound: (q: string) => string;
    /** Nada no filtro escolhido, sem busca. */
    emptyFilter?: (filter: F) => string;
  };
  emptyIcon: ComponentType<SVGProps<SVGSVGElement>>;
  itemKey: (item: T) => string;
  /** Conteúdo de cada linha (título, detalhes, ações). */
  renderItem: (item: T) => ReactNode;
  onAdd: () => void;
};

/**
 * Tela de listagem: cabeçalho com o botão de adicionar, filtro (opcional), busca, ordenação, lista
 * paginada e os estados de carregando, erro e vazio. Cada tela só diz o que é dela (textos, opções
 * e a linha).
 */
export function CollectionView<T, S extends string, F extends string = never>({
  collection,
  title,
  countLabel,
  addLabel = "Adicionar",
  sortOptions,
  filter,
  search,
  messages,
  emptyIcon: EmptyIcon,
  itemKey,
  renderItem,
  onAdd,
}: Props<T, S, F>) {
  const { page, catalogTotal, query, loading, failed } = collection;

  function goTo(target: number) {
    collection.goTo(target);
    // A página nova começa do topo da lista, não onde a anterior terminou
    window.scrollTo(0, 0);
  }

  const first = page ? page.page * page.size + 1 : 0;
  const last = page ? first + page.items.length - 1 : 0;
  // Com filtro, o total sem busca é só o do filtro escolhido: os controles continuam na tela
  const catalogEmpty = !filter && catalogTotal === 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="display">{title}</h1>
          {/* A linha existe mesmo vazia: o botão ao lado fica na mesma altura em todas as telas */}
          <p className="secondary page-count">
            {catalogTotal !== null && catalogTotal > 0 && countLabel(catalogTotal, query.filter)}
          </p>
        </div>
        <button type="button" className="button primary" onClick={onAdd}>
          <AddIcon className="icon" aria-hidden />
          {addLabel}
        </button>
      </header>

      {failed ? (
        <div role="alert" className="notice">
          <p>{messages.loadError}</p>
          <button type="button" className="button" onClick={collection.reload}>
            Tentar novamente
          </button>
        </div>
      ) : page === null ? (
        <p role="status" className="secondary">
          {messages.loading}
        </p>
      ) : catalogEmpty ? (
        <div className="empty">
          <EmptyIcon className="empty-icon" aria-hidden />
          <h2>{messages.emptyTitle}</h2>
          <p className="secondary">{messages.emptyText}</p>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <label className="search">
              <SearchIcon className="icon" aria-hidden />
              <input
                type="search"
                placeholder={search.placeholder}
                aria-label={search.label}
                value={query.q}
                onChange={(event) => collection.search(event.target.value)}
              />
            </label>
            <SortMenu
              options={sortOptions}
              value={query.sort}
              onChange={collection.sortBy}
              filter={
                filter && query.filter !== undefined
                  ? { ...filter, value: query.filter, onChange: collection.filterBy }
                  : undefined
              }
            />
          </div>

          {page.items.length === 0 ? (
            <p className="secondary">
              {query.q.trim() || query.filter === undefined || !messages.emptyFilter
                ? messages.notFound(query.q)
                : messages.emptyFilter(query.filter)}
            </p>
          ) : (
            <>
              {/* Cada resposta do back é uma lista nova: troca de uma vez, sem animar linha a
                  linha (as linhas deslizando dentro do cartão arredondado ficavam quadradas
                  nas bordas). Enquanto a próxima carrega, a atual fica apagada (CSS) */}
              <ul className="list" aria-label={title} aria-busy={loading}>
                {page.items.map((item) => (
                  <li key={itemKey(item)} className="row">
                    {renderItem(item)}
                  </li>
                ))}
              </ul>
              <footer className="list-footer">
                <p className="secondary">
                  {first === last
                    ? `Mostrando ${first} de ${page.totalItems}`
                    : `Mostrando ${first}–${last} de ${page.totalItems}`}
                </p>
                <Pagination page={page.page} totalPages={page.totalPages} onChange={goTo} />
              </footer>
            </>
          )}
        </>
      )}
    </>
  );
}
