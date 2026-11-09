import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { newMember, search } from "./flows";

/** Foto deitada (800 × 600): precisa ser recortada para o quadro 2:3. */
const PHOTO = join(import.meta.dirname, "fixtures", "membro.jpg");

test.describe("Membros", () => {
  test("cadastra um membro com a foto ajustada no recorte", async ({ page }) => {
    // Arrange
    const member = newMember();
    await page.goto("/#/membros");

    // Act
    await page.getByRole("button", { name: "Adicionar" }).click();
    const form = page.getByRole("dialog", { name: "Novo membro" });
    await form.getByLabel("Nome").fill(member.name);
    await form.getByLabel("E-mail").fill(member.email);
    await form.getByLabel("Arquivo da foto").setInputFiles(PHOTO);

    // No ajuste: aproxima com a roda do mouse e arrasta a foto para o lado
    const crop = page.getByRole("dialog", { name: "Ajustar foto" });
    const frame = crop.getByRole("group", { name: /Posição da foto/ });
    await expect(crop.getByRole("img", { name: "Foto escolhida" })).toBeVisible();
    const box = (await frame.boundingBox())!;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, -300);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 20, { steps: 10 });
    await page.mouse.up();
    await crop.getByRole("button", { name: "Usar foto" }).click();

    await expect(form.getByRole("img", { name: "Foto do membro" })).toBeVisible();
    await form.getByRole("button", { name: "Salvar" }).click();

    // Assert
    await expect(form).toBeHidden();
    await search(page, "Buscar membros", member.email);
    const row = page.getByRole("list", { name: "Membros" }).getByRole("listitem");
    await expect(row.getByRole("link", { name: member.name })).toBeVisible();
    // A foto que volta do servidor é o recorte, já no tamanho final 2:3
    const photo = row
      .getByRole("button", { name: `Ampliar foto de ${member.name}` })
      .locator("img");
    await expect
      .poll(() =>
        photo.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]),
      )
      .toEqual([600, 900]);
  });
});
