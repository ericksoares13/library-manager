import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  // Pressionando o botão: o ponteiro que abriu o menu ainda não foi solto
  const pressing = useRef<{ pointerId: number } | null>(null);
  // Escolha mais recente (o efeito que ouve o ponteiro não é recriado a cada render)
  const chooseRef = useRef<(index: number) => void>(() => undefined);
  const choseByPress = useRef(false);

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
    // Pressionar (no botão ou numa opção), deslizar até a opção e soltar escolhe, como nos menus
    // do iOS. Passar o mouse por cima e clicar continua valendo: é pressionar e soltar no lugar
    const optionAt = (event: PointerEvent) =>
      (event.target as Element).closest?.<HTMLElement>("[data-index]") ?? null;
    const followPress = (event: PointerEvent) => {
      if (pressing.current?.pointerId === event.pointerId) {
        const option = optionAt(event);
        setActive(option ? Number(option.dataset.index) : -1);
      }
    };
    const releasePress = (event: PointerEvent) => {
      if (pressing.current?.pointerId !== event.pointerId) {
        return;
      }
      pressing.current = null;
      const option = optionAt(event);
      if (option) {
        // O click que vem depois do pointerup não escolhe de novo
        choseByPress.current = true;
        chooseRef.current(Number(option.dataset.index));
      }
    };
    const cancelPress = () => {
      pressing.current = null;
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("pointermove", followPress);
    document.addEventListener("pointerup", releasePress);
    document.addEventListener("pointercancel", cancelPress);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("pointermove", followPress);
      document.removeEventListener("pointerup", releasePress);
      document.removeEventListener("pointercancel", cancelPress);
    };
  }, [open]);

  function openMenu() {
    choseByPress.current = false;
    // Nenhuma opção destacada até o ponteiro passar por ela ou uma seta ser usada
    setActive(-1);
    setOpen(true);
  }

  // Pelo teclado o foco volta ao botão; com o ponteiro não (o anel de foco é para o teclado)
  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) {
      buttonRef.current?.focus();
    }
  }

  function choose(option: SortOption<S>, returnFocus = true) {
    if (option.value !== value) {
      onChange(option.value);
    }
    close(returnFocus);
  }

  useEffect(() => {
    chooseRef.current = (index) => choose(options[index], false);
  });

  function handleButtonPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    // Abre já ao pressionar. No toque o ponteiro fica preso ao botão: solto, os eventos seguintes
    // chegam à opção sob o dedo
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    // Sem o mousedown que viria depois: ele tiraria o foco do menu (que o teclado usa) para o botão
    event.preventDefault();
    pressing.current = { pointerId: event.pointerId };
    openMenu();
  }

  function handleListPointerDown(event: ReactPointerEvent<HTMLUListElement>) {
    if (event.button !== 0) {
      return;
    }
    // No toque o ponteiro fica preso à opção pressionada: solto, segue o dedo pelas outras
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    pressing.current = { pointerId: event.pointerId };
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
        onPointerDown={handleButtonPointerDown}
        // O ponteiro já abriu ou fechou no pointerdown; o clique só vale pelo teclado (Enter/Espaço)
        onClick={(event) => event.detail === 0 && (open ? setOpen(false) : openMenu())}
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
            onPointerDown={handleListPointerDown}
            onPointerLeave={() => setActive(-1)}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-${index}`}
                data-index={index}
                role="option"
                aria-selected={option.value === value}
                className={index === active ? "menu-option is-active" : "menu-option"}
                onPointerEnter={() => setActive(index)}
                onClick={() => {
                  // Clique sem ponteiro (leitor de tela); com ponteiro, o pointerup já escolheu
                  if (choseByPress.current) {
                    choseByPress.current = false;
                    return;
                  }
                  choose(option, false);
                }}
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
