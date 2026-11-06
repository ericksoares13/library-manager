import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, UnfoldMoreIcon } from "../icons";
import { settle } from "../motion";

export type SortOption<S extends string> = { value: S; label: string };

type Props<S extends string> = {
  options: SortOption<S>[];
  value: S;
  onChange: (value: S) => void;
};

/**
 * Seletor de ordenação em menu próprio (o `<select>` nativo abre o menu do sistema, fora do
 * visual). Segue o padrão listbox: setas movem, Enter/Espaço escolhe, Esc e clique fora fecham.
 */
export function SortMenu<S extends string>({ options, value, onChange }: Props<S>) {
  const reduceMotion = useReducedMotion();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    listRef.current?.focus();
    const closeOnOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  function openMenu() {
    // Nenhuma opção destacada até o ponteiro passar por ela ou uma seta ser usada
    setActive(-1);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function choose(option: SortOption<S>) {
    if (option.value !== value) {
      onChange(option.value);
    }
    close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const moves: Record<string, number> = {
      ArrowDown: active < 0 ? 0 : (active + 1) % options.length,
      ArrowUp: active < 0 ? options.length - 1 : (active - 1 + options.length) % options.length,
      Home: 0,
      End: options.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (active >= 0) {
        choose(options[active]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 };

  return (
    <div className="sort-menu" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="sort-button"
        aria-label={`Ordenar por ${selected.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className="secondary">Ordenar por</span>
        <span className="sort-value">{selected.label}</span>
        <UnfoldMoreIcon className="icon" aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label="Ordenar por"
            aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
            tabIndex={-1}
            className="menu"
            // Nasce do botão (canto superior direito), não do centro
            style={{ transformOrigin: "top right" }}
            initial={hidden}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={hidden}
            transition={settle}
            onKeyDown={handleKeyDown}
            onPointerLeave={() => setActive(-1)}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={index === active ? "menu-option is-active" : "menu-option"}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                <CheckIcon className="icon menu-check" aria-hidden />
                {option.label}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
