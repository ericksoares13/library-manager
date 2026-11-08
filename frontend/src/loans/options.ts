import type { LoanSort, LoanStatus } from "../api/loans";
import type { SortOption } from "../components/collection/CollectionView";

// Opções da listagem de empréstimos (tela de empréstimos e página do membro)

export const statusOptions: SortOption<LoanStatus>[] = [
  { value: "ACTIVE", label: "Ativos" },
  { value: "OVERDUE", label: "Atrasados" },
  { value: "RETURNED", label: "Devolvidos" },
  { value: "ALL", label: "Todos" },
];

export const sortOptions: SortOption<LoanSort>[] = [
  { value: "DUE_DATE", label: "Vencimento" },
  { value: "RECENT", label: "Mais recentes" },
];

export const emptyByStatus: Record<LoanStatus, string> = {
  ACTIVE: "Nenhum empréstimo ativo.",
  OVERDUE: "Nenhum empréstimo atrasado.",
  RETURNED: "Nenhuma devolução registrada.",
  ALL: "Nenhum empréstimo registrado.",
};

// Singular e plural de cada situação, para a linha abaixo do título ("4 empréstimos ativos")
const countByStatus: Record<LoanStatus, [string, string]> = {
  ACTIVE: ["empréstimo ativo", "empréstimos ativos"],
  OVERDUE: ["empréstimo atrasado", "empréstimos atrasados"],
  RETURNED: ["empréstimo devolvido", "empréstimos devolvidos"],
  ALL: ["empréstimo registrado", "empréstimos registrados"],
};

export function countLabel(total: number, status: LoanStatus = "ACTIVE") {
  const [singular, plural] = countByStatus[status];
  return `${total} ${total === 1 ? singular : plural}`;
}
