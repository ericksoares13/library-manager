import { describe, expect, it } from "vitest";
import { validateBook, type BookForm } from "./validation";

const validForm: BookForm = {
  title: "Dom Casmurro",
  author: "Machado de Assis",
  isbn: "9788535910663",
  totalCopies: "2",
};

describe("Validação do formulário de livro", () => {
  it("aceita um formulário completo", () => {
    // Arrange
    const form = validForm;

    // Act
    const errors = validateBook(form);

    // Assert
    expect(errors).toEqual({});
  });

  it.each(["", "   "])("exige título e autor preenchidos (%j)", (blank) => {
    // Arrange
    const form = { ...validForm, title: blank, author: blank };

    // Act
    const errors = validateBook(form);

    // Assert
    expect(errors).toEqual({ title: "Informe o título.", author: "Informe o autor." });
  });

  it("exige o ISBN", () => {
    // Arrange
    const form = { ...validForm, isbn: "" };

    // Act
    const errors = validateBook(form);

    // Assert
    expect(errors).toEqual({ isbn: "Informe o ISBN." });
  });

  // Tamanho errado / letras / 10 dígitos com letra no fim
  it.each(["12345", "97885359106AB", "853591066X"])("recusa ISBN %j", (isbn) => {
    // Arrange
    const form = { ...validForm, isbn };

    // Act
    const errors = validateBook(form);

    // Assert
    expect(errors).toEqual({ isbn: "O ISBN deve ter 10 ou 13 dígitos." });
  });

  it("aceita ISBN de 10 dígitos", () => {
    // Arrange
    const form = { ...validForm, isbn: "8535910662" };

    // Act
    const errors = validateBook(form);

    // Assert
    expect(errors).toEqual({});
  });

  // Zero / vazio / não numérico / fracionário
  it.each(["0", "", "abc", "1.5"])("recusa %j exemplares", (totalCopies) => {
    // Arrange
    const form = { ...validForm, totalCopies };

    // Act
    const errors = validateBook(form);

    // Assert
    expect(errors).toEqual({ totalCopies: "Informe ao menos 1 exemplar." });
  });

  it("não deixa o total abaixo dos exemplares emprestados", () => {
    // Arrange
    const form = { ...validForm, totalCopies: "1" };

    // Act
    const errors = validateBook(form, 2);

    // Assert
    expect(errors).toEqual({ totalCopies: "Há 2 exemplares emprestados." });
  });

  it("aceita total igual aos exemplares emprestados", () => {
    // Arrange
    const form = { ...validForm, totalCopies: "2" };

    // Act
    const errors = validateBook(form, 2);

    // Assert
    expect(errors).toEqual({});
  });
});
