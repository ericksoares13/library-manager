import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BooksPage } from "./books/BooksPage";
import { TabBar } from "./components/TabBar";
import { LoansPage } from "./loans/LoansPage";
import { MembersPage } from "./members/MembersPage";

const tabs = [
  { hash: "#/livros", label: "Livros", Page: BooksPage },
  { hash: "#/membros", label: "Membros", Page: MembersPage },
  { hash: "#/emprestimos", label: "Empréstimos", Page: LoansPage },
] as const;

// Rota pelo hash: voltar/avançar e recarregar mantêm a tela, sem configurar o servidor
const tabOf = (hash: string) => tabs.find((tab) => tab.hash === hash) ?? tabs[0];
const currentTab = () => tabOf(window.location.hash);

export default function App() {
  const [active, setActive] = useState(currentTab);
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

  return (
    <>
      <header className="toolbar">
        <span className="toolbar-title">Biblioteca</span>
        <TabBar tabs={tabs} active={active.hash} label="Seções" />
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
