import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ZoomInIcon, ZoomOutIcon } from "../components/icons";
import { settle } from "../components/motion";
import {
  clampOffset,
  coverScale,
  cropArea,
  MAX_ZOOM,
  maxOffset,
  PHOTO_SIZE,
  rubberband,
  type Area,
  type Size,
} from "./crop";

type Props = {
  /** Endereço da imagem escolhida ou tirada (object URL). */
  src: string;
  onConfirm: (photo: Blob) => void;
  onCancel: () => void;
  /** Não foi possível abrir a imagem (arquivo que não é imagem ou corrompido). */
  onError: () => void;
};

/** Tamanho do quadro antes de medir (o CSS define o de verdade: 2:3 com até 15rem de largura). */
const DEFAULT_FRAME: Size = { width: 240, height: 360 };

/** Passo das setas do teclado, em px na tela. */
const KEY_STEP = 10;

/** Recorta a `area` da imagem e devolve a foto em JPEG no tamanho final (2:3). */
function toJpeg(image: HTMLImageElement, area: Area): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE.width;
  canvas.height = PHOTO_SIZE.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Canvas indisponível"));
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    PHOTO_SIZE.width,
    PHOTO_SIZE.height,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a foto"))),
      "image/jpeg",
      0.85,
    ),
  );
}

const distance = (a: PointerEvent, b: PointerEvent) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/**
 * Ajuste da foto num quadro 2:3: arrastar move (1:1 com o dedo, com resistência além da borda e
 * volta com mola ao soltar), pinça, roda do mouse e o controle deslizante aproximam. Pelo teclado:
 * setas movem, + e − aproximam. A foto final é exatamente o que está no quadro.
 */
export function PhotoCropper({ src, onConfirm, onCancel, onError }: Props) {
  const reduceMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [frame, setFrame] = useState<Size>(DEFAULT_FRAME);
  const [image, setImage] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const scale = image ? coverScale(image, frame) * zoom : 1;

  // O quadro tem tamanho do CSS (muda com a largura da tela): mede antes de desenhar
  useLayoutEffect(() => {
    const measure = () => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        setFrame({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /** Leva a imagem para o lugar válido mais próximo (com mola, a partir de onde ela está). */
  function settleInside(nextScale = scale) {
    if (!image) {
      return;
    }
    const target = clampOffset({ x: x.get(), y: y.get() }, image, frame, nextScale);
    const transition = reduceMotion ? { duration: 0 } : settle;
    animate(x, target.x, transition);
    animate(y, target.y, transition);
  }

  /** Aproxima ou afasta mantendo o centro do quadro no mesmo ponto da imagem. */
  function zoomTo(next: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(1, next));
    if (!image || clamped === zoom) {
      return;
    }
    const ratio = clamped / zoom;
    const nextScale = coverScale(image, frame) * clamped;
    const target = clampOffset({ x: x.get() * ratio, y: y.get() * ratio }, image, frame, nextScale);
    x.set(target.x);
    y.set(target.y);
    setZoom(clamped);
  }

  // Ponteiros na tela (um arrasta, dois fazem pinça) e o estado do gesto em andamento
  const gesture = useRef<{
    pointers: Map<number, PointerEvent>;
    start: { x: number; y: number; originX: number; originY: number } | null;
    pinch: { distance: number; zoom: number } | null;
  }>({ pointers: new Map(), start: null, pinch: null });
  // Os handlers nativos (abaixo) leem sempre os valores atuais
  const latest = useRef({ zoomTo, settleInside, image, frame, scale, zoom });
  useEffect(() => {
    latest.current = { zoomTo, settleInside, image, frame, scale, zoom };
  });

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }
    const state = gesture.current;

    const beginDrag = (pointer: PointerEvent) => {
      state.start = {
        x: pointer.clientX,
        y: pointer.clientY,
        originX: x.get(),
        originY: y.get(),
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      element.setPointerCapture?.(event.pointerId);
      state.pointers.set(event.pointerId, event);
      const pointers = [...state.pointers.values()];
      if (pointers.length === 2) {
        state.start = null;
        state.pinch = { distance: distance(pointers[0], pointers[1]), zoom: latest.current.zoom };
      } else if (pointers.length === 1) {
        beginDrag(event);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!state.pointers.has(event.pointerId)) {
        return;
      }
      state.pointers.set(event.pointerId, event);
      const { image, frame, scale } = latest.current;
      const pointers = [...state.pointers.values()];
      if (state.pinch && pointers.length === 2) {
        const spread = distance(pointers[0], pointers[1]) / state.pinch.distance;
        latest.current.zoomTo(state.pinch.zoom * spread);
      } else if (state.start && image) {
        // 1:1 com o dedo; além da borda, com resistência
        const max = maxOffset(image, frame, scale);
        x.set(rubberband(state.start.originX + event.clientX - state.start.x, max.x, frame.width));
        y.set(rubberband(state.start.originY + event.clientY - state.start.y, max.y, frame.height));
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      state.pointers.delete(event.pointerId);
      state.pinch = null;
      const remaining = [...state.pointers.values()];
      if (remaining.length === 1) {
        // Da pinça para um dedo só: continua arrastando de onde está
        beginDrag(remaining[0]);
      } else if (remaining.length === 0) {
        state.start = null;
        latest.current.settleInside();
      }
    };

    // A roda do mouse aproxima (sem rolar a página: o listener não pode ser passivo)
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { zoomTo, zoom } = latest.current;
      zoomTo(zoom * Math.exp(-event.deltaY * 0.002));
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerEnd);
    element.addEventListener("pointercancel", onPointerEnd);
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerEnd);
      element.removeEventListener("pointercancel", onPointerEnd);
      element.removeEventListener("wheel", onWheel);
    };
  }, [x, y]);

  function handleKeyDown(event: KeyboardEvent) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    if (event.key in moves && image) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      const target = clampOffset({ x: x.get() + dx, y: y.get() + dy }, image, frame, scale);
      x.set(target.x);
      y.set(target.y);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomTo(zoom + 0.25);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomTo(zoom - 0.25);
    }
  }

  async function confirm() {
    const element = imageRef.current;
    if (!image || !element) {
      return;
    }
    setSaving(true);
    const offset = clampOffset({ x: x.get(), y: y.get() }, image, frame, scale);
    try {
      onConfirm(await toJpeg(element, cropArea(image, frame, scale, offset)));
    } catch {
      setSaving(false);
      onError();
    }
  }

  const width = image ? image.width * scale : 0;
  const height = image ? image.height * scale : 0;

  return (
    <>
      <div
        ref={frameRef}
        className="cropper"
        role="group"
        tabIndex={0}
        aria-label="Posição da foto: arraste ou use as setas"
        onKeyDown={handleKeyDown}
      >
        <motion.img
          ref={imageRef}
          src={src}
          alt="Foto escolhida"
          draggable={false}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setImage({ width: naturalWidth, height: naturalHeight });
          }}
          onError={onError}
          style={{
            x,
            y,
            width,
            height,
            left: (frame.width - width) / 2,
            top: (frame.height - height) / 2,
            opacity: image ? 1 : 0,
          }}
        />
      </div>

      <div className="cropper-zoom">
        <ZoomOutIcon className="icon" aria-hidden />
        <input
          type="range"
          aria-label="Zoom"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={!image}
          onChange={(event) => zoomTo(Number(event.target.value))}
        />
        <ZoomInIcon className="icon" aria-hidden />
      </div>

      <footer className="sheet-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="button primary"
          disabled={!image || saving}
          onClick={confirm}
        >
          Usar foto
        </button>
      </footer>
    </>
  );
}
