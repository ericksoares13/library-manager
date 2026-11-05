import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, vi } from "vitest";

// Animações terminam na hora: os testes verificam o estado final, não o movimento
MotionGlobalConfig.skipAnimations = true;

// O jsdom não rola a página (só avisa "Not implemented"); os testes espiam a chamada
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
