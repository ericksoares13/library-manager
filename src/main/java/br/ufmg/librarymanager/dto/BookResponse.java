package br.ufmg.librarymanager.dto;

import br.ufmg.librarymanager.model.Book;

public record BookResponse(
        String id, String title, String author, String isbn, int totalCopies, int availableCopies) {

    public static BookResponse from(final Book book) {
        return new BookResponse(
                book.getId(),
                book.getTitle(),
                book.getAuthor(),
                book.getIsbn(),
                book.getTotalCopies(),
                book.getAvailableCopies());
    }
}
