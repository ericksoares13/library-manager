import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemberPhoto } from "./MemberPhoto";

describe("Foto do membro", () => {
  it("pede a foto com a versão no endereço", () => {
    // Arrange
    const member = { id: "m1", name: "Ana Souza", photoVersion: 3 };

    // Act
    render(<MemberPhoto member={member} size="small" />);

    // Assert
    const button = screen.getByRole("button", { name: "Ampliar foto de Ana Souza" });
    expect(button.querySelector("img")).toHaveAttribute("src", "/api/members/m1/photo?v=3");
  });

  it("mostra o ícone de pessoa, sem pedir imagem, quando o membro não tem foto", () => {
    // Arrange
    const member = { id: "m1", name: "Ana Souza", photoVersion: null };

    // Act
    const { container } = render(<MemberPhoto member={member} size="small" />);

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
