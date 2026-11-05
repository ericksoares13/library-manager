import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BooksPage } from "./books/BooksPage";
import { settle } from "./components/motion";
import { MembersPage } from "./members/MembersPage";

const tabs = [
  { hash: "#/livros", label: "Livros", Page: BooksPage },
  { hash: "#/membros", label: "Membros", Page: MembersPage },
] as const;

// Rota pelo hash: voltar/avançar e recarregar mantêm a tela, sem configurar o servidor
const tabOf = (hash: string) => tabs.find((tab) => tab.hash === hash) ?? tabs[0];
const currentTab = () => tabOf(window.location.hash);

type Pill = { x: number; width: number };

export default function App() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(currentTab);
  const [pill, setPill] = useState<Pill | null>(null);
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());
  // Posição da rolagem de cada aba: a janela rola uma só, mas cada tela volta para onde estava
  const scrollByTab = useRef(new Map<string, number>());

  useEffect(() => {
    const onHashChange = (event: HashChangeEvent) => {
      scrollByTab.current.set(tabOf(new URL(event.oldURL).hash).hash, window.scrollY);
      setActive(currentTab());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Antes da pintura, para a tela nova não aparecer na rolagem da anterior
  useLayoutEffect(() => {
    window.scrollTo(0, scrollByTab.current.get(active.hash) ?? 0);
  }, [active]);

  // A pílula vai para a aba ativa medida dentro do próprio controle (offsetLeft), e não na
  // página: assim a rolagem não interfere e ela só desliza na horizontal
  useLayoutEffect(() => {
    const measure = () => {
      const tab = tabRefs.current.get(active.hash);
      if (tab) {
        setPill({ x: tab.offsetLeft, width: tab.offsetWidth });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  return (
    <>
      <header className="toolbar">
        <span className="toolbar-title">Biblioteca</span>
        <nav aria-label="Seções" className="tabs">
          {pill && (
            <motion.span
              className="tab-indicator"
              aria-hidden
              initial={false}
              animate={pill}
              transition={reduceMotion ? { duration: 0 } : settle}
            />
          )}
          <ul>
            {tabs.map((tab) => (
              <li key={tab.hash}>
                <a
                  ref={(element) => {
                    if (element) {
                      tabRefs.current.set(tab.hash, element);
                    }
                  }}
                  href={tab.hash}
                  className="tab"
                  aria-current={tab === active ? "page" : undefined}
                >
                  {tab.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      {/* As telas ficam montadas: trocar de aba é instantâneo e mantém lista, busca e rolagem */}
      {tabs.map(({ hash, Page }) => (
        <main key={hash} className="page" hidden={hash !== active.hash}>
          <Page />
        </main>
      ))}
    </>
  );
}
