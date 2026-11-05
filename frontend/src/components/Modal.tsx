import { motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { settle } from "./motion";

type Props = {
  titleId: string;
  role?: "dialog" | "alertdialog";
  onClose: () => void;
  children: ReactNode;
};

/**
 * Painel modal: escurece o fundo (tarefa que bloqueia o fluxo) e entra/sai pelo mesmo caminho.
 * Deve ser renderizado dentro de um `AnimatePresence` para animar a saída.
 */
export function Modal({ titleId, role = "dialog", onClose, children }: Props) {
  const reduceMotion = useReducedMotion();
  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-layer">
      <motion.div
        className="scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={settle}
        onClick={onClose}
      />
      <motion.div
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet"
        initial={hidden}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={hidden}
        transition={settle}
      >
        {children}
      </motion.div>
    </div>
  );
}
