import { motion, useReducedMotion } from "motion/react";

// Mola criticamente amortecida (sem overshoot): o padrão para tudo que não vem de um gesto
const settle = { type: "spring", bounce: 0, duration: 0.4 } as const;

export default function App() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <header className="toolbar">
        <span className="toolbar-title">Biblioteca</span>
      </header>
      <motion.main
        className="page"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={settle}
      >
        <h1 className="display">Livros</h1>
        <p className="secondary">O acervo aparecerá aqui.</p>
      </motion.main>
    </>
  );
}
