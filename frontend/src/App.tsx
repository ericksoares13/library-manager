import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { BooksPage } from "./books/BooksPage";
import { TabBar } from "./components/TabBar";
import { LoansPage } from "./loans/LoansPage";
import { MembersPage } from "./members/MembersPage";

/** Cada tela recebe o que vem depois da aba no endereço (ex.: o id em `#/membros/<id>`). */
export type PageProps = { param?: string };

type Tab = { hash: string; label: string; Page: ComponentType<PageProps> };

const tabs: readonly Tab[] = [
  { hash: "#/livros", label: "Livros", Page: BooksPage },
  { hash: "#/membros", label: "Membros", Page: MembersPage },
  { hash: "#/emprestimos", label: "Empréstimos", Page: LoansPage },
];

type Route = {
  tab: Tab;
  /** Endereço completo da tela (`#/membros/<id>`): cada um guarda a própria rolagem. */
  hash: string;
  /** O que vem depois da aba (`<id>` em `#/membros/<id>`), se houver. */
  param?: string;
};

// Rota pelo hash: voltar/avançar e recarregar mantêm a tela, sem configurar o servidor
function routeOf(hash: string): Route {
  const tab = tabs.find((t) => hash === t.hash || hash.startsWith(`${t.hash}/`));
  if (!tab) {
    return { tab: tabs[0], hash: tabs[0].hash };
  }
  const param = hash.slice(tab.hash.length + 1);
  return param ? { tab, hash, param: decodeURIComponent(param) } : { tab, hash: tab.hash };
}

const currentRoute = () => routeOf(window.location.hash);

export default function App() {
  const [route, setRoute] = useState(currentRoute);
  // Posição da rolagem de cada tela: a janela rola uma só, mas cada tela volta para onde estava
  const scrollByHash = useRef(new Map<string, number>());

  useEffect(() => {
    const onHashChange = (event: HashChangeEvent) => {
      scrollByHash.current.set(routeOf(new URL(event.oldURL).hash).hash, window.scrollY);
      setRoute(currentRoute());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Antes da pintura, para a tela nova não aparecer na rolagem da anterior
  useLayoutEffect(() => {
    window.scrollTo(0, scrollByHash.current.get(route.hash) ?? 0);
  }, [route]);

  return (
    <>
      <header className="toolbar">
        <span className="toolbar-title">Biblioteca</span>
        <TabBar tabs={tabs} active={route.tab.hash} label="Seções" />
      </header>
      {/* As telas ficam montadas: trocar de aba é instantâneo e mantém lista, busca e rolagem */}
      {tabs.map(({ hash, Page }) => (
        <main key={hash} className="page" hidden={hash !== route.tab.hash}>
          <Page param={hash === route.tab.hash ? route.param : undefined} />
        </main>
      ))}
    </>
  );
}
