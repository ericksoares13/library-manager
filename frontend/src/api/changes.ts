// As telas ficam montadas ao trocar de aba: um empréstimo muda a disponibilidade mostrada na lista
// de livros, uma edição muda o título na lista de empréstimos. Toda alteração avisa as listagens,
// que buscam a página de novo
const DATA_CHANGED = "library:data-changed";

export function notifyDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED));
}

/** Chama `listener` a cada alteração salva na API; devolve a função que para de ouvir. */
export function onDataChanged(listener: () => void) {
  window.addEventListener(DATA_CHANGED, listener);
  return () => window.removeEventListener(DATA_CHANGED, listener);
}
