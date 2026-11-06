import { describe, expect, it } from "vitest";
import { pageSlots } from "./pageSlots";

// Páginas em base 0 (o botão mostra +1)
describe("Páginas mostradas na paginação", () => {
  it("mostra todas quando são poucas", () => {
    // Arrange
    const totalPages = 3;

    // Act
    const slots = pageSlots(1, totalPages);

    // Assert
    expect(slots).toEqual([0, 1, 2]);
  });

  it("mostra a primeira, a última e as vizinhas da atual, com reticências no meio", () => {
    // Arrange
    const current = 5;

    // Act
    const slots = pageSlots(current, 10);

    // Assert
    expect(slots).toEqual([0, "gap", 4, 5, 6, "gap", 9]);
  });

  it("mostra o número em vez de reticências quando falta uma página só", () => {
    // Arrange
    const current = 3;

    // Act
    const slots = pageSlots(current, 6);

    // Assert
    expect(slots).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("na primeira página mostra a seguinte e a última", () => {
    // Arrange
    const current = 0;

    // Act
    const slots = pageSlots(current, 6);

    // Assert
    expect(slots).toEqual([0, 1, "gap", 5]);
  });
});
