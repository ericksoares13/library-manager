import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { createPortal } from "react-dom";
import { settle } from "./motion";

type Props = {
  /** Imagem no tamanho da tela; `null` quando não há imagem (só o ícone, sem pedir nada). */
  src: string | null;
  /** Imagem ampliada (maior), por cima da `src` enquanto carrega. */
  zoomSrc: string | null;
  /** Nome da imagem, em minúsculas: "capa de Dom Casmurro" ("Ampliar capa de Dom Casmurro"). */
  label: string;
  /** `small` na linha da lista, `large` no cabeçalho da página de detalhe. */
  size: "small" | "large";
  /** Ícone no lugar da imagem que não existe ou não carregou. */
  placeholderIcon: ComponentType<SVGProps<SVGSVGElement>>;
};

/** Lugar, tamanho e arredondamento dos cantos (px) da imagem na tela. */
type Rect = { x: number; y: number; width: number; height: number; radius: number };

/** Cantos da imagem ampliada (0,75rem): proporcionais ao tamanho, como nos cartões grandes. */
const ZOOMED_RADIUS = 12;

/** Proporção de capa (2:3) quando a imagem ainda não informou a sua (largura / altura). */
const BOOK_RATIO = 2 / 3;

/** Onde a imagem está na tela agora (lugar, tamanho e cantos). */
function rectOf(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, radius };
}

/** Onde a imagem ampliada fica: centralizada, o maior tamanho que cabe com folga na janela. */
function zoomedRect(ratio: number): Rect {
  const height = Math.min(window.innerHeight * 0.8, (window.innerWidth * 0.9) / ratio, 720);
  const width = height * ratio;
  return {
    x: (window.innerWidth - width) / 2,
    y: (window.innerHeight - height) / 2,
    width,
    height,
    radius: ZOOMED_RADIUS,
  };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Imagem num espaço fixo 2:3 (capa do livro, foto do membro). Sem imagem, ou se ela não carregar,
 * aparece o ícone. Com imagem, tocar amplia: ela cresce do lugar onde está até o centro da tela e
 * volta para lá ao fechar (clique em qualquer lugar ou Esc).
 */
export function ZoomableImage({ src, zoomSrc, label, size, placeholderIcon: Icon }: Props) {
  const reduceMotion = useReducedMotion();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  // Posição da imagem na tela ao abrir (o zoom sai dela e volta para ela) e onde fica ampliada
  const [zoom, setZoom] = useState<{ origin: Rect; target: Rect } | null>(null);
  const [zooming, setZooming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  if (!src || failedSrc === src) {
    return (
      <span className={`cover cover-${size} cover-placeholder`} aria-hidden>
        <Icon className="cover-icon" />
      </span>
    );
  }

  function open() {
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    const image = imageRef.current;
    const ratio = image?.naturalWidth ? image.naturalWidth / image.naturalHeight : BOOK_RATIO;
    // A imagem aparece inteira, na proporção dela: o zoom sai dela e mantém a proporção
    setZoom({ origin: rectOf(image ?? button), target: zoomedRect(ratio) });
    setZooming(true);
  }

  function close() {
    const button = buttonRef.current;
    const image = imageRef.current;
    // Volta para onde a imagem está agora, não para onde estava ao abrir (a janela pode ter mudado)
    if (image) {
      setZoom((current) => current && { ...current, origin: rectOf(image) });
    }
    setZooming(false);
    button?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`cover cover-${size} cover-button`}
        aria-label={`Ampliar ${label}`}
        // Durante o zoom a imagem "está" no centro da tela: o lugar dela fica vazio
        style={{ visibility: zoom ? "hidden" : undefined }}
        onClick={open}
      >
        <img ref={imageRef} src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
      </button>
      {createPortal(
        <AnimatePresence
          // A posição medida ao fechar chega à imagem que está saindo (`custom`)
          custom={zoom?.origin}
          // A imagem volta a aparecer no lugar só quando a ampliada termina de voltar até ela
          onExitComplete={() => setZoom(null)}
        >
          {zooming && zoom && (
            <CoverZoom
              key="zoom"
              label={capitalize(label)}
              preview={src}
              full={zoomSrc ?? src}
              origin={zoom.origin}
              target={zoom.target}
              reduceMotion={Boolean(reduceMotion)}
              onClose={close}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

type ZoomProps = {
  /** "Capa de Dom Casmurro": nome do diálogo e texto alternativo da imagem ampliada. */
  label: string;
  /** A imagem que já está na tela, enquanto a grande carrega. */
  preview: string;
  full: string;
  origin: Rect;
  target: Rect;
  reduceMotion: boolean;
  onClose: () => void;
};

function CoverZoom({ label, preview, full, origin, target, reduceMotion, onClose }: ZoomProps) {
  const [loaded, setLoaded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // O efeito abaixo roda só ao abrir; o Esc chama sempre o `onClose` mais recente
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    dialogRef.current?.focus();
    // Sem rolar a página por trás da imagem ampliada (a barra de rolagem tem espaço reservado no CSS:
    // escondê-la não desloca a página)
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      root.style.overflow = previousOverflow;
    };
  }, []);

  // Do lugar e tamanho da imagem original até o centro. Anima a caixa de verdade (não a escala):
  // escalar encolheria também os cantos, e a imagem voltaria quadrada ao lugar dela
  const box = (rect: Rect) => ({
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    borderRadius: rect.radius,
  });
  const variants = {
    // `at`: onde a imagem está na tela (ao abrir e, ao fechar, medida de novo)
    small: (at: Rect) =>
      reduceMotion ? { ...box(target), opacity: 0 } : { ...box(at), opacity: 1 },
    zoomed: { ...box(target), opacity: 1 },
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className="cover-zoom-layer"
      onClick={onClose}
    >
      <motion.div
        className="scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={settle}
      />
      <motion.div
        className="cover-zoom"
        custom={origin}
        variants={variants}
        initial="small"
        animate="zoomed"
        exit="small"
        transition={settle}
      >
        <img src={preview} alt="" />
        <img
          src={full}
          alt={label}
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
        />
      </motion.div>
    </div>
  );
}
