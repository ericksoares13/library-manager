import { defineConfig, devices } from "@playwright/test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

// Os testes end-to-end sobem a aplicação de verdade (o jar do Spring Boot, que já serve o front)
// numa porta própria e com um banco próprio no MongoDB local, sem mexer nos dados de
// desenvolvimento. O jar vem do `./gradlew bootJar` (a task `e2eTest` do Gradle gera antes)

const PORT = 8090;
const BASE_URL = `http://localhost:${PORT}`;
const LIBS = join(import.meta.dirname, "..", "build", "libs");

/** O jar executável do Spring Boot (o `-plain.jar` não tem as dependências). */
function bootJar() {
  const jar = readdirSync(LIBS).find(
    (file) => file.endsWith(".jar") && !file.endsWith("-plain.jar"),
  );
  if (!jar) {
    throw new Error(`Nenhum jar em ${LIBS}: rode ./gradlew bootJar antes`);
  }
  return join(LIBS, jar);
}

export default defineConfig({
  testDir: "e2e",
  // Os fluxos passam por várias telas e o CI (macOS/Windows) é lento
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Um teste por vez: todos usam a mesma aplicação e o mesmo banco
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `java -jar "${bootJar()}"`,
    url: `${BASE_URL}/api/books`,
    // Local: aproveita a aplicação de teste se já estiver rodando na porta
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      MONGODB_URI: process.env.E2E_MONGODB_URI ?? "mongodb://localhost:27017/library-e2e",
    },
  },
});
