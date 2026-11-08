import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Page } from "../api/page";

type Results<T> = { q: string; page: Page<T> } | { q: string; failed: true };

type Props<T> = {
  label: string;
  placeholder: string;
  /** Busca a primeira página de opções na API (o pedido anterior é cancelado a cada tecla). */
  search: (q: string, signal: AbortSignal) => Promise<Page<T>>;
  itemKey: (item: T) => string;
  /** Texto que fica no campo depois de escolher. */
  itemLabel: (item: T) => string;
  /** Conteúdo de cada opção da lista (título e detalhes). */
  renderOption: (item: T) => ReactNode;
  /** Opções que aparecem, mas não podem ser escolhidas (ex.: livro sem exemplar). */
  isDisabled?: (item: T) => boolean;
  value: T | null;
  onChange: (item: T | null) => void;
  error?: string;
  autoFocus?: boolean;
};

/**
 * Campo com busca para escolher um item cadastrado (padrão combobox): digitar filtra no back, as
 * setas percorrem a lista, Enter escolhe, Esc fecha. Editar o texto desfaz a escolha.
 */
export function SearchPicker<T>({
  label,
  placeholder,
  search,
  itemKey,
  itemLabel,
  renderOption,
  isDisabled = () => false,
  value,
  onChange,
  error,
  autoFocus,
}: Props<T>) {
  const id = useId();
  const listId = `${id}-list`;
  const messageId = `${id}-message`;
  const [text, setText] = useState(value ? itemLabel(value) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState<Results<T> | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    search(text, controller.signal).then(
      (page) => setResults({ q: text, page }),
      () => {
        if (!controller.signal.aborted) {
          setResults({ q: text, failed: true });
        }
      },
    );
    return () => controller.abort();
  }, [open, search, text]);

  // Resultado de outra busca (o texto mudou e a nova ainda não voltou) conta como carregando
  const current = results?.q === text ? results : null;
  const page = current && "page" in current ? current.page : null;
  const items = page?.items ?? [];
  // Só a primeira página aparece: o resto se encontra digitando
  const hidden = page ? page.totalItems - items.length : 0;

  function choose(item: T) {
    if (isDisabled(item)) {
      return;
    }
    onChange(item);
    setText(itemLabel(item));
    setOpen(false);
  }

  function move(step: number) {
    const enabled = items.map((item, index) => (isDisabled(item) ? -1 : index));
    const candidates = enabled.filter((index) => index >= 0);
    if (candidates.length === 0) {
      return;
    }
    const position = candidates.indexOf(active);
    const next =
      position < 0
        ? step > 0
          ? 0
          : candidates.length - 1
        : (position + step + candidates.length) % candidates.length;
    setActive(candidates[next]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && open) {
      // Enter com a lista aberta escolhe; não envia o formulário
      event.preventDefault();
      if (items[active]) {
        choose(items[active]);
      }
    } else if (event.key === "Escape" && open) {
      // Fecha só a lista: o evento não chega ao document, onde o Modal fecha com Esc
      event.stopPropagation();
      setOpen(false);
    }
  }

  const status =
    current === null
      ? "Buscando…"
      : "failed" in current
        ? "Não foi possível buscar. Tente de novo."
        : items.length === 0
          ? "Nada encontrado."
          : null;

  return (
    <div className="field picker">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setActive(-1);
          setOpen(true);
          if (value) {
            onChange(null);
          }
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div className="picker-popover">
          {status ? (
            <p role="status" className="picker-status secondary">
              {status}
            </p>
          ) : null}
          <ul id={listId} role="listbox" aria-label={label} className="picker-list">
            {items.map((item, index) => (
              <li
                key={itemKey(item)}
                id={`${id}-${index}`}
                role="option"
                aria-selected={value !== null && itemKey(value) === itemKey(item)}
                aria-disabled={isDisabled(item) || undefined}
                className={index === active ? "picker-option is-active" : "picker-option"}
                // Sem perder o foco do campo: o blur fecharia a lista antes do clique
                onPointerDown={(event) => event.preventDefault()}
                onPointerEnter={() => !isDisabled(item) && setActive(index)}
                onClick={() => choose(item)}
              >
                {renderOption(item)}
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <p className="picker-status secondary">
              Mostrando {items.length} de {page?.totalItems}. Digite para encontrar os outros.
            </p>
          )}
        </div>
      )}
      {error && (
        <p id={messageId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
