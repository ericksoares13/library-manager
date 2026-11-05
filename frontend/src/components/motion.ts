// Mola criticamente amortecida (sem overshoot): o padrão para tudo que não vem de um gesto
export const settle = { type: "spring", bounce: 0, duration: 0.35 } as const;
