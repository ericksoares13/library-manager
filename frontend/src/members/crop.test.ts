import { describe, expect, it } from "vitest";
import { clampOffset, coverScale, cropArea, rubberband } from "./crop";

// Foto de celular deitada (4:3) num quadro 2:3 de 200 × 300 px
const image = { width: 4000, height: 3000 };
const frame = { width: 200, height: 300 };

describe("Recorte da foto", () => {
  it("cobre o quadro pela dimensão que falta", () => {
    // Arrange
    const landscape = image;

    // Act
    const scale = coverScale(landscape, frame);

    // Assert
    expect(scale).toBe(0.1);
  });

  it("recorta o centro da imagem quando ela não foi movida", () => {
    // Arrange
    const scale = coverScale(image, frame);

    // Act
    const area = cropArea(image, frame, scale, { x: 0, y: 0 });

    // Assert
    expect(area).toEqual({ x: 1000, y: 0, width: 2000, height: 3000 });
  });

  it("mover a imagem para a direita recorta mais à esquerda, já com o zoom", () => {
    // Arrange
    const scale = coverScale(image, frame) * 2;

    // Act
    const area = cropArea(image, frame, scale, { x: 50, y: -30 });

    // Assert
    expect(area).toEqual({ x: 1250, y: 900, width: 1000, height: 1500 });
  });

  it("não deixa a imagem descobrir o quadro", () => {
    // Arrange
    const scale = coverScale(image, frame);

    // Act
    const offset = clampOffset({ x: 500, y: 20 }, image, frame, scale);

    // Assert
    expect(offset).toEqual({ x: 100, y: 0 });
  });

  it("dentro do limite, segue o dedo sem resistência", () => {
    // Arrange
    const value = 80;

    // Act
    const result = rubberband(value, 100, 200);

    // Assert
    expect(result).toBe(80);
  });

  it("além do limite, anda menos que o dedo, para os dois lados", () => {
    // Arrange
    const overshoot = 100;

    // Act
    const result = rubberband(-(100 + overshoot), 100, 200);

    // Assert
    expect(result).toBeLessThan(-100);
    expect(result).toBeGreaterThan(-(100 + overshoot));
  });
});
