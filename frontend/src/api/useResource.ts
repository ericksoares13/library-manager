import { useEffect, useState } from "react";
import { onDataChanged } from "./changes";

type State<T> = { key: unknown; data?: T; error?: unknown };

/**
 * Carrega algo da API (ex.: o membro da página dele) e busca de novo a cada alteração salva em
 * qualquer tela. `load` deve ser estável (`useCallback`): trocar `load` busca de novo.
 */
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T> | null>(null);

  useEffect(() => onDataChanged(() => setVersion((current) => current + 1)), []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => setState({ key: load, data }),
      (error) => {
        if (!controller.signal.aborted) {
          setState({ key: load, error });
        }
      },
    );
    return () => controller.abort();
  }, [load, version]);

  // O resultado de outro `load` (ex.: a página de outro membro) não vale para o atual
  const current = state?.key === load ? state : null;
  return { data: current?.data ?? null, error: current?.error ?? null };
}
