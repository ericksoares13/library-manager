import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import type { Loan } from "../api/loans";
import { borrowErrorMessage, formatDate, loanSituation } from "./format";

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "l1",
    bookId: "b1",
    bookTitle: "Dom Casmurro",
    memberId: "m1",
    memberName: "Ana Souza",
    loanDate: "2026-11-08",
    dueDate: "2026-11-22",
    returnDate: null,
    overdue: false,
    ...overrides,
  };
}

const conflict = (message: string) => new ApiError(message, 409);

describe("Formatação de empréstimos", () => {
  it("mostra a data da API no formato brasileiro", () => {
    // Arrange
    const isoDate = "2026-03-02";

    // Act
    const formatted = formatDate(isoDate);

    // Assert
    expect(formatted).toBe("02/03/2026");
  });

  it("mostra o prazo de um empréstimo em dia", () => {
    // Arrange
    const active = loan();

    // Act
    const situation = loanSituation(active);

    // Assert
    expect(situation).toBe("Devolver até 22/11/2026");
  });

  it("mostra desde quando o empréstimo está atrasado", () => {
    // Arrange
    const late = loan({ overdue: true });

    // Act
    const situation = loanSituation(late);

    // Assert
    expect(situation).toBe("Atrasado desde 22/11/2026");
  });

  it("mostra a data da devolução", () => {
    // Arrange
    const returned = loan({ returnDate: "2026-11-10" });

    // Act
    const situation = loanSituation(returned);

    // Assert
    expect(situation).toBe("Devolvido em 10/11/2026");
  });
});

describe("Mensagem de empréstimo recusado", () => {
  it("explica o limite de empréstimos do membro", () => {
    // Arrange
    const error = conflict("Ana Souza has reached the limit of 3 active loans");

    // Act
    const message = borrowErrorMessage(error);

    // Assert
    expect(message).toBe("Este membro já tem 3 empréstimos ativos, o limite.");
  });

  it("explica que o membro já está com o livro", () => {
    // Arrange
    const error = conflict("Member already has an active loan for this book");

    // Act
    const message = borrowErrorMessage(error);

    // Assert
    expect(message).toBe("Este membro já está com um exemplar deste livro.");
  });

  it("explica que não há exemplar disponível", () => {
    // Arrange
    const error = conflict("No copies available for this book");

    // Act
    const message = borrowErrorMessage(error);

    // Assert
    expect(message).toBe("Não há exemplar disponível deste livro.");
  });

  it("avisa quando o livro ou o membro foi excluído", () => {
    // Arrange
    const error = new ApiError("Book not found: b1", 404);

    // Act
    const message = borrowErrorMessage(error);

    // Assert
    expect(message).toBe("O livro ou o membro não existe mais.");
  });

  it("pede para tentar de novo em qualquer outra falha", () => {
    // Arrange
    const error = new TypeError("Failed to fetch");

    // Act
    const message = borrowErrorMessage(error);

    // Assert
    expect(message).toBe("Não foi possível registrar o empréstimo. Tente novamente.");
  });
});
