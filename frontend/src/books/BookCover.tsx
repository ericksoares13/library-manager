import { MenuBookIcon } from "../components/icons";
import { ZoomableImage } from "../components/ZoomableImage";

type Props = {
  isbn: string;
  /** Título do livro, para o nome do botão de ampliar ("Ampliar capa de Dom Casmurro"). */
  title: string;
  /** `small` na linha da lista, `large` na página do livro. */
  size: "small" | "large";
};

const coverUrl = (isbn: string, variant: "S" | "M" | "L") =>
  `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-${variant}.jpg?default=false`;

/**
 * Capa do livro pelo ISBN, da Open Library (serviço público e gratuito). `default=false` faz o
 * serviço responder 404 quando não tem a capa: aí aparece o ícone de livro, sem imagem quebrada.
 */
export function BookCover({ isbn, title, size }: Props) {
  return (
    <ZoomableImage
      src={coverUrl(isbn, size === "small" ? "S" : "M")}
      zoomSrc={coverUrl(isbn, "L")}
      label={`capa de ${title}`}
      size={size}
      placeholderIcon={MenuBookIcon}
    />
  );
}
