import type { ComponentType, ReactNode, SVGProps } from "react";
import { AddIcon, SearchIcon } from "../icons";
import { Pagination } from "./Pagination";
import { SortMenu, type SortOption } from "./SortMenu";
import type { Collection } from "./useCollection";

export type { SortOption };

type Props<T, S extends string> = {
  collection: Collection<T, S>;
  /** Título da tela e nome acessível da lista ("Livros"). */
  title: string;
  /** Linha abaixo do título, a partir do total do acervo ("101 livros no acervo"). */
  countLabel: (total: number) => string;
  sortOptions: SortOption<S>[];
  search: { label: string; placeholder: string };
  messages: {
    loading: string;
    loadError: string;
    emptyTitle: string;
    emptyText: string;
    notFound: (q: string) => string;
  };
  emptyIcon: ComponentType<SVGProps<SVGSVGElement>>;
  itemKey: (item: T) => string;
  /** Conteúdo de cada linha (título, detalhes, ações). */
  renderItem: (item: T) => ReactNode;
  onAdd: () => void;
};

/**
 * Tela de listagem: cabeçalho com "Adicionar", busca, ordenação, lista paginada e os estados de
 * carregando, erro e vazio. Cada tela só diz o que é dela (textos, opções e a linha).
 */
export function CollectionView<T, S extends string>({
  collection,
  title,
  countLabel,
  sortOptions,
  search,
  messages,
  emptyIcon: EmptyIcon,
  itemKey,
  renderItem,
  onAdd,
}: Props<T, S>) {
  const { page, catalogTotal, query, loading, failed } = collection;

  function goTo(target: number) {
    collection.goTo(target);
    // A página nova começa do topo da lista, não onde a anterior terminou
    window.scrollTo(0, 0);
  }

  const first = page ? page.page * page.size + 1 : 0;
  const last = page ? first + page.items.length - 1 : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="display">{title}</h1>
          {catalogTotal !== null && catalogTotal > 0 && (
            <p className="secondary">{countLabel(catalogTotal)}</p>
          )}
        </div>
        <button type="button" className="button primary" onClick={onAdd}>
          <AddIcon className="icon" aria-hidden />
          Adicionar
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
      ) : catalogTotal === 0 ? (
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
            <SortMenu options={sortOptions} value={query.sort} onChange={collection.sortBy} />
          </div>

          {page.items.length === 0 ? (
            <p className="secondary">{messages.notFound(query.q)}</p>
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
