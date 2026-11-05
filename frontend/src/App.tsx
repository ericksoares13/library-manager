import { BooksPage } from "./books/BooksPage";

export default function App() {
  return (
    <>
      <header className="toolbar">
        <span className="toolbar-title">Biblioteca</span>
      </header>
      <main className="page">
        <BooksPage />
      </main>
    </>
  );
}
