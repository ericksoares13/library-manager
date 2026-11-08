import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MenuBookIcon } from "../components/icons";
import { settle } from "../components/motion";

type Props = {
  isbn: string;
  /** Título do livro, para o nome do botão de ampliar ("Ampliar capa de Dom Casmurro"). */
  title: string;
  /** `small` na linha da lista, `large` na página do livro. */
  size: "small" | "large";
};

/** Lugar, tamanho e arredondamento dos cantos (px) da capa na tela. */
type Rect = { x: number; y: number; width: number; height: number; radius: number };

/** Cantos da capa ampliada (0,75rem): proporcionais ao tamanho, como nos cartões grandes. */
const ZOOMED_RADIUS = 12;

/** Proporção de capa quando a imagem ainda não informou a sua (largura / altura). */
const BOOK_RATIO = 2 / 3;

const coverUrl = (isbn: string, variant: "S" | "M" | "L") =>
  `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-${variant}.jpg?default=false`;

/** Onde a capa está na tela agora (lugar, tamanho e cantos). */
function rectOf(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, radius };
}

/** Onde a capa ampliada fica: centralizada, o maior tamanho que cabe com folga na janela. */
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

/**
 * Capa do livro pelo ISBN, da Open Library (serviço público e gratuito). `default=false` faz o
 * serviço responder 404 quando não tem a capa: aí aparece o ícone de livro, sem imagem quebrada.
 * Com capa, tocar amplia: ela cresce do lugar onde está até o centro da tela e volta para lá ao
 * fechar (clique em qualquer lugar ou Esc).
 */
export function BookCover({ isbn, title, size }: Props) {
  const reduceMotion = useReducedMotion();
  const [failedIsbn, setFailedIsbn] = useState<string | null>(null);
  // Posição da capa na tela ao abrir (o zoom sai dela e volta para ela) e onde fica ampliada
  const [zoom, setZoom] = useState<{ origin: Rect; target: Rect } | null>(null);
  const [zooming, setZooming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const variant = size === "small" ? "S" : "M";

  if (failedIsbn === isbn) {
    return (
      <span className={`cover cover-${size} cover-placeholder`} aria-hidden>
        <MenuBookIcon className="cover-icon" />
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
    // Volta para onde a capa está agora, não para onde estava ao abrir (a janela pode ter mudado)
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
        aria-label={`Ampliar capa de ${title}`}
        // Durante o zoom a capa "está" no centro da tela: o lugar dela fica vazio
        style={{ visibility: zoom ? "hidden" : undefined }}
        onClick={open}
      >
        <img
          ref={imageRef}
          src={coverUrl(isbn, variant)}
          alt=""
          loading="lazy"
          onError={() => setFailedIsbn(isbn)}
        />
      </button>
      {createPortal(
        <AnimatePresence
          // A posição medida ao fechar chega à capa que está saindo (`custom`)
          custom={zoom?.origin}
          // A capa volta a aparecer no lugar só quando a ampliada termina de voltar até ela
          onExitComplete={() => setZoom(null)}
        >
          {zooming && zoom && (
            <CoverZoom
              key="zoom"
              title={title}
              preview={coverUrl(isbn, variant)}
              full={coverUrl(isbn, "L")}
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
  title: string;
  /** A imagem que já está na tela, enquanto a grande carrega. */
  preview: string;
  full: string;
  origin: Rect;
  target: Rect;
  reduceMotion: boolean;
  onClose: () => void;
};

function CoverZoom({ title, preview, full, origin, target, reduceMotion, onClose }: ZoomProps) {
  const [loaded, setLoaded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // O efeito abaixo roda só ao abrir; o Esc chama sempre o `onClose` mais recente
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    dialogRef.current?.focus();
    // Sem rolar a página por trás da capa ampliada (a barra de rolagem tem espaço reservado no CSS:
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

  // Do lugar e tamanho da capa original até o centro. Anima a caixa de verdade (não a escala):
  // escalar encolheria também os cantos, e a capa voltaria quadrada ao lugar dela
  const box = (rect: Rect) => ({
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    borderRadius: rect.radius,
  });
  const variants = {
    // `at`: onde a capa está na tela (ao abrir e, ao fechar, medida de novo)
    small: (at: Rect) =>
      reduceMotion ? { ...box(target), opacity: 0 } : { ...box(at), opacity: 1 },
    zoomed: { ...box(target), opacity: 1 },
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Capa de ${title}`}
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
          alt={`Capa de ${title}`}
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
        />
      </motion.div>
    </div>
  );
}
