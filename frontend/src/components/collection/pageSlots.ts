type Slot = number | "gap";

/**
 * Páginas a mostrar: a primeira, a última e as vizinhas da atual; o resto vira "…".
 * Ex.: atual 5 de 10 → 1 … 4 5 6 … 10 (em base 1). Lacuna de uma página só mostra o número.
 */
export function pageSlots(page: number, totalPages: number): Slot[] {
  const shown = [0, totalPages - 1, page - 1, page, page + 1]
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => a - b)
    .filter((p, index, all) => p !== all[index - 1]);
  return shown.flatMap((p, index): Slot[] => {
    const previous = shown[index - 1];
    if (previous === undefined || p - previous === 1) {
      return [p];
    }
    return p - previous === 2 ? [previous + 1, p] : ["gap", p];
  });
}
