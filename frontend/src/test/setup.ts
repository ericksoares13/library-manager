import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, vi } from "vitest";

// Animações terminam na hora: os testes verificam o estado final, não o movimento
MotionGlobalConfig.skipAnimations = true;

// O jsdom não rola a página (só avisa "Not implemented"); os testes espiam a chamada
window.scrollTo = () => {};

// O jsdom não cria endereços locais para arquivos (a foto do membro): um endereço falso por arquivo
let objectUrls = 0;
URL.createObjectURL = () => `blob:test/${++objectUrls}`;
URL.revokeObjectURL = () => {};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
