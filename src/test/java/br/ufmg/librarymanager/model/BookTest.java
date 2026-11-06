package br.ufmg.librarymanager.model;

import br.ufmg.librarymanager.exception.BusinessException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Livro")
class BookTest {

    private static Book bookWithCopies(final int totalCopies) {
        return new Book("Dom Casmurro", "Machado de Assis", "9788535910663", totalCopies);
    }

    @Test
    @DisplayName("Livro novo começa com todos os exemplares disponíveis e com as chaves de busca")
    void givenValidData_whenCreateBook_thenAllCopiesAreAvailableAndSearchKeysAreSet() {
        // Arrange
        final int totalCopies = 3;

        // Act
        final Book book = bookWithCopies(totalCopies);

        // Assert
        Assertions.assertEquals(totalCopies, book.getAvailableCopies());
        Assertions.assertEquals(0, book.getBorrowedCopies());
        Assertions.assertEquals(SearchKey.of(book.getTitle()), book.getTitleKey());
        Assertions.assertEquals(SearchKey.of(book.getAuthor()), book.getAuthorKey());
    }

    @Test
    @DisplayName("Não permite criar livro sem exemplares")
    void givenZeroCopies_whenCreateBook_thenThrowsBusinessException() {
        // Arrange
        final int totalCopies = 0;

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(BusinessException.class, () -> bookWithCopies(totalCopies));

        // Assert
        Assertions.assertEquals("totalCopies must be at least 1", thrown.getMessage());
    }

    @Test
    @DisplayName("Empréstimo diminui os exemplares disponíveis")
    void givenAvailableCopies_whenBorrowCopy_thenAvailableCopiesDecrease() {
        // Arrange
        final Book book = bookWithCopies(2);

        // Act
        book.borrowCopy();

        // Assert
        Assertions.assertEquals(1, book.getAvailableCopies());
        Assertions.assertEquals(1, book.getBorrowedCopies());
    }

    @Test
    @DisplayName("Não empresta quando não há exemplar disponível")
    void givenNoAvailableCopies_whenBorrowCopy_thenThrowsBusinessException() {
        // Arrange
        final Book book = bookWithCopies(1);
        book.borrowCopy();

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(BusinessException.class, book::borrowCopy);

        // Assert
        Assertions.assertEquals("No copies available for this book", thrown.getMessage());
    }

    @Test
    @DisplayName("Fica indisponível com todos os exemplares emprestados")
    void givenAllCopiesBorrowed_whenCheckAvailability_thenBookIsUnavailable() {
        // Arrange
        final Book book = bookWithCopies(1);
        book.borrowCopy();

        // Act
        final boolean available = book.isAvailable();

        // Assert
        Assertions.assertFalse(available);
    }

    @Test
    @DisplayName("Devolução aumenta os exemplares disponíveis")
    void givenBorrowedCopy_whenReturnCopy_thenAvailableCopiesIncrease() {
        // Arrange
        final Book book = bookWithCopies(2);
        book.borrowCopy();

        // Act
        book.returnCopy();

        // Assert
        Assertions.assertEquals(2, book.getAvailableCopies());
        Assertions.assertTrue(book.isAvailable());
    }

    @Test
    @DisplayName("Não aceita devolução sem exemplar emprestado")
    void givenNoBorrowedCopies_whenReturnCopy_thenThrowsBusinessException() {
        // Arrange
        final Book book = bookWithCopies(2);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(BusinessException.class, book::returnCopy);

        // Assert
        Assertions.assertEquals(
                "All copies of this book are already available", thrown.getMessage());
    }

    @Test
    @DisplayName("Atualiza título e autor junto com as chaves de busca")
    void givenNewTitleAndAuthor_whenUpdateDetails_thenBookAndSearchKeysAreUpdated() {
        // Arrange
        final Book book = bookWithCopies(2);

        // Act
        book.updateDetails("Memórias Póstumas de Brás Cubas", "Machado", 2);

        // Assert
        Assertions.assertEquals("Memórias Póstumas de Brás Cubas", book.getTitle());
        Assertions.assertEquals("Machado", book.getAuthor());
        Assertions.assertEquals(SearchKey.of(book.getTitle()), book.getTitleKey());
        Assertions.assertEquals(SearchKey.of(book.getAuthor()), book.getAuthorKey());
    }

    @Test
    @DisplayName("Aumentar o total preserva os exemplares emprestados")
    void givenBorrowedCopies_whenIncreaseTotalCopies_thenBorrowedCopiesArePreserved() {
        // Arrange
        final Book book = bookWithCopies(3);
        book.borrowCopy();
        book.borrowCopy();

        // Act
        book.updateDetails("Dom Casmurro", "Machado de Assis", 5);

        // Assert
        Assertions.assertEquals(5, book.getTotalCopies());
        Assertions.assertEquals(2, book.getBorrowedCopies());
        Assertions.assertEquals(3, book.getAvailableCopies());
    }

    @Test
    @DisplayName("Total igual aos emprestados zera os disponíveis")
    void givenBorrowedCopies_whenTotalEqualsBorrowed_thenNoCopyIsAvailable() {
        // Arrange
        final Book book = bookWithCopies(3);
        book.borrowCopy();
        book.borrowCopy();

        // Act
        book.updateDetails("Dom Casmurro", "Machado de Assis", 2);

        // Assert
        Assertions.assertEquals(0, book.getAvailableCopies());
    }

    @Test
    @DisplayName("Não permite total menor que os exemplares emprestados")
    void givenBorrowedCopies_whenTotalBelowBorrowed_thenThrowsBusinessException() {
        // Arrange
        final Book book = bookWithCopies(3);
        book.borrowCopy();
        book.borrowCopy();

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class,
                        () -> book.updateDetails("Dom Casmurro", "Machado de Assis", 1));

        // Assert
        Assertions.assertEquals(
                "totalCopies cannot be lower than the 2 borrowed copies", thrown.getMessage());
    }

    @Test
    @DisplayName("Não permite atualizar para zero exemplares")
    void givenZeroCopies_whenUpdateDetails_thenThrowsBusinessException() {
        // Arrange
        final Book book = bookWithCopies(3);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class,
                        () -> book.updateDetails("Dom Casmurro", "Machado de Assis", 0));

        // Assert
        Assertions.assertEquals("totalCopies must be at least 1", thrown.getMessage());
    }
}
