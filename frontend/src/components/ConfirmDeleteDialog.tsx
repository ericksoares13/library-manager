import { useId, useState } from "react";
import { ApiError } from "../api/client";
import { Modal } from "./Modal";

type Props = {
  /** Nome do item, mostrado na pergunta ("Excluir “Dom Casmurro”?"). */
  name: string;
  /** Mensagem quando a API recusa a exclusão com 409 (regra de negócio). */
  conflictMessage: string;
  /** Mensagem para qualquer outra falha. */
  errorMessage: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

/** Confirmação antes de excluir: a ação não pode ser desfeita. */
export function ConfirmDeleteDialog({
  name,
  conflictMessage,
  errorMessage,
  onConfirm,
  onClose,
}: Props) {
  const titleId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409 ? conflictMessage : errorMessage);
      setDeleting(false);
    }
  }

  return (
    <Modal titleId={titleId} role="alertdialog" onClose={onClose}>
      <h2 id={titleId}>Excluir “{name}”?</h2>
      <p className="secondary">Esta ação não pode ser desfeita.</p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <footer className="sheet-actions">
        <button type="button" className="button" onClick={onClose} autoFocus>
          Cancelar
        </button>
        <button
          type="button"
          className="button destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          Excluir
        </button>
      </footer>
    </Modal>
  );
}
