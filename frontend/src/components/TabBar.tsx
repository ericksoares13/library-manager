import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { settle } from "./motion";

type Tab = { hash: string; label: string };
type Segment = { x: number; width: number };

type Props = {
  tabs: readonly Tab[];
  /** Hash da aba ativa (`#/livros`). */
  active: string;
  label: string;
};

// Movimento mínimo antes de começar a arrastar: um toque com tremida continua sendo toque
const DRAG_THRESHOLD = 4;

// Quanto a pílula pode encolher ao ser empurrada contra a borda (fração da largura)
const MAX_SQUISH = 0.2;

// Projeção do momento e resistência progressiva: fórmulas da skill apple-design (seções 6 e 9)
const project = (velocity: number, rate = 0.99) => ((velocity / 1000) * rate) / (1 - rate);
const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

/** Largura da pílula na posição x: interpola entre as larguras das abas vizinhas. */
function widthAt(x: number, segments: Segment[]) {
  const next = segments.findIndex((segment) => segment.x >= x);
  if (next === -1) {
    return segments.at(-1)?.width ?? 0;
  }
  if (next === 0) {
    return segments[0].width;
  }
  const [from, to] = [segments[next - 1], segments[next]];
  return from.width + ((to.width - from.width) * (x - from.x)) / (to.x - from.x);
}

const nearest = (x: number, segments: Segment[]) =>
  segments.reduce(
    (best, segment, index) =>
      Math.abs(segment.x - x) < Math.abs(segments[best].x - x) ? index : best,
    0,
  );

/**
 * Abas em controle segmentado. A pílula desliza até a aba tocada e também pode ser arrastada,
 * como no iOS: segue o ponteiro 1:1 sem sair do trilho (empurrada contra a borda, encolhe um
 * pouco) e, ao soltar, vai para a aba mais próxima de onde o gesto levaria.
 */
export function TabBar({ tabs, active, label }: Props) {
  const reduceMotion = useReducedMotion();
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.hash === active),
  );
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());
  // Posições medidas dentro do próprio controle (offsetLeft): a rolagem da página não interfere
  const segments = useRef<Segment[]>([]);
  // Aba para onde a pílula está indo; evita animar de novo quando o gesto já a levou até lá
  const target = useRef(activeIndex);
  const drag = useRef<{ pointerId: number; grab: number; startX: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const [measured, setMeasured] = useState(false);
  const [pressed, setPressed] = useState(false);
  // Posição no trilho (decide a aba) e compressão contra a borda (< 0 esquerda, > 0 direita)
  const position = useMotionValue(0);
  const squish = useMotionValue(0);
  // O que aparece na tela: a pílula encolhe colada na borda contra a qual é empurrada
  const x = useMotionValue(0);
  const width = useMotionValue(0);

  useEffect(() => {
    const render = () => {
      const s = squish.get();
      x.set(position.get() + Math.max(s, 0));
      width.set(widthAt(position.get(), segments.current) - Math.abs(s));
    };
    const unsubscribe = [position.on("change", render), squish.on("change", render)];
    return () => unsubscribe.forEach((stop) => stop());
  }, [position, squish, x, width]);

  useLayoutEffect(() => {
    const measure = () => {
      segments.current = tabs.map((tab) => {
        const element = tabRefs.current.get(tab.hash);
        return { x: element?.offsetLeft ?? 0, width: element?.offsetWidth ?? 0 };
      });
      const segment = segments.current[target.current];
      position.jump(segment.x);
      x.jump(segment.x);
      width.jump(segment.width);
      setMeasured(true);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tabs, position, x, width]);

  const moveTo = useCallback(
    (index: number, velocity = 0) => {
      target.current = index;
      const destination = segments.current[index].x;
      if (reduceMotion) {
        position.jump(destination);
      } else {
        animate(position, destination, { ...settle, velocity });
      }
    },
    [position, reduceMotion],
  );

  // Só quando a aba ativa muda (toque, voltar do navegador, endereço). Re-renderizações no meio do
  // caminho (ex.: soltar a pílula antes de o hash mudar) não podem puxá-la de volta
  useEffect(() => {
    if (measured && target.current !== activeIndex) {
      moveTo(activeIndex);
    }
  }, [activeIndex, measured, moveTo]);

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    suppressClick.current = false;
    const tab = (event.target as Element).closest("a");
    // Como no iOS, arrasta-se a pílula: o gesto começa na aba ativa
    if (event.button !== 0 || tab?.getAttribute("href") !== active) {
      return;
    }
    position.stop();
    squish.stop();
    drag.current = {
      pointerId: event.pointerId,
      grab: event.clientX - position.get(),
      startX: event.clientX,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPressed(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    if (!current.moved && Math.abs(event.clientX - current.startX) < DRAG_THRESHOLD) {
      return;
    }
    current.moved = true;
    const raw = event.clientX - current.grab;
    const min = segments.current[0].x;
    const max = segments.current[segments.current.length - 1].x;
    const clamped = Math.min(max, Math.max(min, raw));
    // Além da borda a pílula não anda: encolhe com resistência crescente, até MAX_SQUISH
    const limit = widthAt(clamped, segments.current) * MAX_SQUISH;
    position.set(clamped);
    squish.set(Math.max(-limit, Math.min(limit, rubberband(raw - clamped, limit * 4))));
  }

  function finishDrag(event: PointerEvent<HTMLElement>, cancelled: boolean) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    setPressed(false);
    if (!current.moved) {
      return;
    }
    suppressClick.current = true;
    if (reduceMotion) {
      squish.jump(0);
    } else {
      animate(squish, 0, settle);
    }
    if (cancelled) {
      moveTo(activeIndex);
      return;
    }
    const velocity = position.getVelocity();
    const projected = position.get() + (reduceMotion ? 0 : project(velocity));
    const index = nearest(projected, segments.current);
    moveTo(index, velocity);
    if (tabs[index].hash !== active) {
      window.location.hash = tabs[index].hash;
    }
  }

  return (
    <nav
      aria-label={label}
      className="tabs"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishDrag(event, false)}
      onPointerCancel={(event) => finishDrag(event, true)}
      onClickCapture={(event) => {
        // O clique que encerra um arraste não é um toque na aba
        if (suppressClick.current) {
          event.preventDefault();
          suppressClick.current = false;
        }
      }}
    >
      {measured && (
        <motion.span
          className="tab-indicator"
          aria-hidden
          style={{ x, width }}
          initial={false}
          animate={{ scale: pressed && !reduceMotion ? 0.95 : 1 }}
          transition={settle}
        />
      )}
      <ul>
        {tabs.map((tab) => (
          <li key={tab.hash}>
            <a
              ref={(element) => {
                if (element) {
                  tabRefs.current.set(tab.hash, element);
                }
              }}
              href={tab.hash}
              className="tab"
              draggable={false}
              aria-current={tab.hash === active ? "page" : undefined}
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
