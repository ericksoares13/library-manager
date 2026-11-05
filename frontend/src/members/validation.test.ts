import { describe, expect, it } from "vitest";
import { validateMember, type MemberForm } from "./validation";

const validForm: MemberForm = { name: "Ana Souza", email: "ana@example.com" };

describe("Validação do formulário de membro", () => {
  it("aceita um formulário completo", () => {
    // Arrange
    const form = validForm;

    // Act
    const errors = validateMember(form);

    // Assert
    expect(errors).toEqual({});
  });

  it.each(["", "   "])("exige nome e e-mail preenchidos (%j)", (blank) => {
    // Arrange
    const form = { name: blank, email: blank };

    // Act
    const errors = validateMember(form);

    // Assert
    expect(errors).toEqual({ name: "Informe o nome.", email: "Informe o e-mail." });
  });

  // Sem "@" / sem nada antes do "@" / dois "@" / com espaço
  it.each(["ana", "@example.com", "ana@@example.com", "ana souza@example.com"])(
    "recusa e-mail %j",
    (email) => {
      // Arrange
      const form = { ...validForm, email };

      // Act
      const errors = validateMember(form);

      // Assert
      expect(errors).toEqual({ email: "Informe um e-mail válido." });
    },
  );
});
