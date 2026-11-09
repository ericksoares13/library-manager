export type Size = { width: number; height: number };

/** Deslocamento (px na tela) do centro da imagem em relação ao centro do quadro. */
export type Offset = { x: number; y: number };

/** Parte da imagem original (px da imagem) que aparece no quadro. */
export type Area = { x: number; y: number; width: number; height: number };

/** Tamanho da foto enviada: 2:3, a mesma proporção das capas dos livros. */
export const PHOTO_SIZE: Size = { width: 600, height: 900 };

/** Quanto se pode aproximar, a partir da imagem cobrindo o quadro inteiro. */
export const MAX_ZOOM = 4;

/** Escala (px na tela por px da imagem) em que a imagem cobre o quadro inteiro, sem sobrar borda. */
export const coverScale = (image: Size, frame: Size) =>
  Math.max(frame.width / image.width, frame.height / image.height);

/** Quanto a imagem pode sair do centro, em cada eixo, sem descobrir o quadro. */
export const maxOffset = (image: Size, frame: Size, scale: number): Offset => ({
  x: Math.max(0, (image.width * scale - frame.width) / 2),
  y: Math.max(0, (image.height * scale - frame.height) / 2),
});

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

/** O deslocamento mais próximo do pedido em que a imagem ainda cobre o quadro. */
export function clampOffset(offset: Offset, image: Size, frame: Size, scale: number): Offset {
  const max = maxOffset(image, frame, scale);
  return { x: clamp(offset.x, max.x), y: clamp(offset.y, max.y) };
}

/**
 * Além do limite, a imagem segue o dedo cada vez menos (como no fim de uma lista no iOS): `value`
 * é o deslocamento pedido, `limit` o máximo permitido e `dimension` o tamanho do quadro no eixo.
 */
export function rubberband(value: number, limit: number, dimension: number) {
  const overshoot = Math.abs(value) - limit;
  if (overshoot <= 0) {
    return value;
  }
  const constant = 0.55;
  const resisted = (overshoot * dimension * constant) / (dimension + constant * overshoot);
  return Math.sign(value) * (limit + resisted);
}

/** A parte da imagem original que está dentro do quadro (o que vira a foto). */
export function cropArea(image: Size, frame: Size, scale: number, offset: Offset): Area {
  const width = frame.width / scale;
  const height = frame.height / scale;
  return {
    x: (image.width - width) / 2 - offset.x / scale,
    y: (image.height - height) / 2 - offset.y / scale,
    width,
    height,
  };
}
