/** Texto para busca sem diferenciar maiúsculas nem acentos ("memorias" encontra "Memórias"). */
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** Se algum dos textos contém a busca. */
export const matches = (query: string, ...texts: string[]) =>
  texts.some((text) => normalize(text).includes(normalize(query)));
