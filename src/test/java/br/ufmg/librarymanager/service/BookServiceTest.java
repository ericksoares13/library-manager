package br.ufmg.librarymanager.service;

import br.ufmg.librarymanager.dto.BookRequest;
import br.ufmg.librarymanager.dto.BookSort;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.repository.BookRepository;
import br.ufmg.librarymanager.repository.LoanRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@DisplayName("Serviço de livros")
@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    private static final String ISBN = "9788535910663";

    @Mock private BookRepository bookRepository;

    @Mock private LoanRepository loanRepository;

    private BookService bookService;

    @BeforeEach
    void setUp() {
        this.bookService = new BookService(this.bookRepository, this.loanRepository);
    }

    private static Book existingBook() {
        return new Book("Dom Casmurro", "Machado de Assis", ISBN, 2);
    }

    private void saveReturnsArgument() {
        Mockito.when(this.bookRepository.save(ArgumentMatchers.any(Book.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Busca livro pelo id")
    void givenExistingId_whenFindById_thenReturnsTheBook() {
        // Arrange
        final Book book = existingBook();
        Mockito.when(this.bookRepository.findById("b1")).thenReturn(Optional.of(book));

        // Act
        final Book result = this.bookService.findById("b1");

        // Assert
        Assertions.assertSame(book, result);
    }

    @Test
    @DisplayName("Busca por id inexistente lança NotFoundException")
    void givenUnknownId_whenFindById_thenThrowsNotFoundException() {
        // Arrange
        Mockito.when(this.bookRepository.findById("missing")).thenReturn(Optional.empty());

        // Act
        final NotFoundException thrown =
                Assertions.assertThrows(
                        NotFoundException.class, () -> this.bookService.findById("missing"));

        // Assert
        Assertions.assertEquals("Book not found: missing", thrown.getMessage());
    }

    @Test
    @DisplayName("Cadastra livro com ISBN novo")
    void givenNewIsbn_whenCreate_thenSavesTheBook() {
        // Arrange
        final BookRequest request = new BookRequest("Dom Casmurro", "Machado de Assis", ISBN, 3);
        this.saveReturnsArgument();

        // Act
        final Book created = this.bookService.create(request);

        // Assert
        Assertions.assertEquals("Dom Casmurro", created.getTitle());
        Assertions.assertEquals(ISBN, created.getIsbn());
    }

    @Test
    @DisplayName("Não cadastra livro com ISBN repetido")
    void givenRegisteredIsbn_whenCreate_thenThrowsBusinessExceptionAndDoesNotSave() {
        // Arrange
        final BookRequest request = new BookRequest("Outro", "Autor", ISBN, 1);
        Mockito.when(this.bookRepository.existsByIsbn(ISBN)).thenReturn(true);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.bookService.create(request));

        // Assert
        Assertions.assertEquals(
                "A book with ISBN " + ISBN + " already exists", thrown.getMessage());
        Mockito.verify(this.bookRepository, Mockito.never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Atualiza os dados do livro")
    void givenNewDetails_whenUpdate_thenBookIsUpdated() {
        // Arrange
        final BookRequest request = new BookRequest("Novo título", "Novo autor", ISBN, 4);
        Mockito.when(this.bookRepository.findById("b1")).thenReturn(Optional.of(existingBook()));
        this.saveReturnsArgument();

        // Act
        final Book updated = this.bookService.update("b1", request);

        // Assert
        Assertions.assertEquals("Novo título", updated.getTitle());
        Assertions.assertEquals("Novo autor", updated.getAuthor());
        Assertions.assertEquals(4, updated.getTotalCopies());
    }

    @Test
    @DisplayName("Não permite alterar o ISBN")
    void givenDifferentIsbn_whenUpdate_thenThrowsBusinessExceptionAndDoesNotSave() {
        // Arrange
        final BookRequest request = new BookRequest("Dom Casmurro", "Machado", "1234567890", 2);
        Mockito.when(this.bookRepository.findById("b1")).thenReturn(Optional.of(existingBook()));

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.bookService.update("b1", request));

        // Assert
        Assertions.assertEquals("The ISBN of a book cannot be changed", thrown.getMessage());
        Mockito.verify(this.bookRepository, Mockito.never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Exclui livro sem empréstimos ativos")
    void givenBookWithoutActiveLoans_whenDelete_thenBookIsRemoved() {
        // Arrange
        final Book book = existingBook();
        Mockito.when(this.bookRepository.findById("b1")).thenReturn(Optional.of(book));
        Mockito.when(this.loanRepository.existsByBookIdAndReturnDateIsNull("b1")).thenReturn(false);

        // Act
        this.bookService.delete("b1");

        // Assert
        Mockito.verify(this.bookRepository).delete(book);
    }

    @Test
    @DisplayName("Não exclui livro com empréstimos ativos")
    void givenBookWithActiveLoans_whenDelete_thenThrowsBusinessExceptionAndKeepsBook() {
        // Arrange
        Mockito.when(this.bookRepository.findById("b1")).thenReturn(Optional.of(existingBook()));
        Mockito.when(this.loanRepository.existsByBookIdAndReturnDateIsNull("b1")).thenReturn(true);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.bookService.delete("b1"));

        // Assert
        Assertions.assertEquals("A book with active loans cannot be deleted", thrown.getMessage());
        Mockito.verify(this.bookRepository, Mockito.never()).delete(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Busca em branco lista todos os livros na ordem pedida")
    void givenBlankQuery_whenSearch_thenListsAllWithTheSort() {
        // Arrange
        final Page<Book> page = new PageImpl<>(List.of(existingBook()));
        Mockito.when(this.bookRepository.findAll(PageRequest.of(1, 20, BookSort.AUTHOR.toSort())))
                .thenReturn(page);

        // Act
        final Page<Book> result = this.bookService.search("  ", BookSort.AUTHOR, 1, 20);

        // Assert
        Assertions.assertSame(page, result);
    }

    @Test
    @DisplayName("Busca no título, no autor e no ISBN sem diferenciar acentos")
    void givenQueryWithAccentsAndCase_whenSearch_thenUsesTheNormalizedKey() {
        // Arrange
        final Pageable pageable = PageRequest.of(0, 20, BookSort.TITLE.toSort());
        final Page<Book> page = new PageImpl<>(List.of(existingBook()));
        Mockito.when(
                        this.bookRepository
                                .findByTitleKeyContainingOrAuthorKeyContainingOrIsbnContaining(
                                        "memorias", "memorias", "memorias", pageable))
                .thenReturn(page);

        // Act
        final Page<Book> result = this.bookService.search(" Memórias ", BookSort.TITLE, 0, 20);

        // Assert
        Assertions.assertSame(page, result);
    }
}
