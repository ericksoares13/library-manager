import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, vi } from "vitest";

// Animações terminam na hora: os testes verificam o estado final, não o movimento
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
