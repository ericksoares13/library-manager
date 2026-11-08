import { useId, useState } from "react";
import { ApiError } from "../api/client";
import { loansApi, type Loan } from "../api/loans";
import { Modal } from "../components/Modal";
import { bookTitleOf, memberNameOf } from "./format";

type Props = {
  loan: Loan;
  onReturned: () => void;
  onClose: () => void;
};

/** Confirmação antes de devolver: a devolução não pode ser desfeita. */
export function ReturnDialog({ loan, onReturned, onClose }: Props) {
  const titleId = useId();
  const [returning, setReturning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReturn() {
    setReturning(true);
    try {
      await loansApi.returnLoan(loan.id);
      onReturned();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? "Este empréstimo já foi devolvido."
          : "Não foi possível registrar a devolução. Tente novamente.",
      );
      setReturning(false);
    }
  }

  return (
    <Modal titleId={titleId} role="alertdialog" onClose={onClose}>
      <h2 id={titleId}>Devolver “{bookTitleOf(loan)}”?</h2>
      <p className="secondary">
        Emprestado para {memberNameOf(loan)}. A devolução fica registrada com a data de hoje.
      </p>
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
          className="button primary"
          onClick={handleReturn}
          disabled={returning}
        >
          Devolver
        </button>
      </footer>
    </Modal>
  );
}
