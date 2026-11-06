package br.ufmg.librarymanager.service;

import br.ufmg.librarymanager.dto.BorrowRequest;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.model.Loan;
import br.ufmg.librarymanager.model.Member;
import br.ufmg.librarymanager.repository.BookRepository;
import br.ufmg.librarymanager.repository.LoanRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
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

@DisplayName("Serviço de empréstimos")
@ExtendWith(MockitoExtension.class)
class LoanServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 2);

    private static final Clock FIXED_CLOCK =
            Clock.fixed(TODAY.atStartOfDay().toInstant(ZoneOffset.UTC), ZoneId.of("UTC"));

    private static final BorrowRequest REQUEST = new BorrowRequest("b1", "m1");

    @Mock private LoanRepository loanRepository;

    @Mock private BookRepository bookRepository;

    @Mock private BookService bookService;

    @Mock private MemberService memberService;

    private LoanService loanService;

    @BeforeEach
    void setUp() {
        this.loanService =
                new LoanService(
                        this.loanRepository,
                        this.bookRepository,
                        this.bookService,
                        this.memberService,
                        FIXED_CLOCK);
    }

    private static Book bookWithCopies(final int totalCopies) {
        return new Book("Dom Casmurro", "Machado de Assis", "9788535910663", totalCopies);
    }

    private void bookAndMemberExist(final Book book) {
        Mockito.when(this.bookService.findById("b1")).thenReturn(book);
        Mockito.when(this.memberService.findById("m1"))
                .thenReturn(new Member("Ana", "ana@example.com"));
    }

    private void loanAndBookExist(final Loan loan, final Book book) {
        Mockito.when(this.loanRepository.findById("l1")).thenReturn(Optional.of(loan));
        Mockito.when(this.bookService.findById("b1")).thenReturn(book);
    }

    private void loanSaveReturnsArgument() {
        Mockito.when(this.loanRepository.save(ArgumentMatchers.any(Loan.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Empréstimo começa hoje e retira um exemplar do livro")
    void givenAvailableBook_whenBorrow_thenCreatesLoanAndTakesOneCopy() {
        // Arrange
        final Book book = bookWithCopies(2);
        this.bookAndMemberExist(book);
        this.loanSaveReturnsArgument();

        // Act
        final Loan loan = this.loanService.borrow(REQUEST);

        // Assert
        Assertions.assertEquals("b1", loan.getBookId());
        Assertions.assertEquals("m1", loan.getMemberId());
        Assertions.assertEquals(TODAY, loan.getLoanDate());
        Assertions.assertEquals(1, book.getAvailableCopies());
        Mockito.verify(this.bookRepository).save(book);
    }

    @Test
    @DisplayName("Permite emprestar com um empréstimo abaixo do limite")
    void givenMemberOneLoanBelowLimit_whenBorrow_thenLoanIsCreated() {
        // Arrange
        this.bookAndMemberExist(bookWithCopies(2));
        Mockito.when(this.loanRepository.countByMemberIdAndReturnDateIsNull("m1"))
                .thenReturn((long) Member.MAX_ACTIVE_LOANS - 1);
        this.loanSaveReturnsArgument();

        // Act
        final Loan loan = this.loanService.borrow(REQUEST);

        // Assert
        Assertions.assertEquals(TODAY, loan.getLoanDate());
    }

    @Test
    @DisplayName("Não empresta a membro no limite de empréstimos")
    void givenMemberAtLoanLimit_whenBorrow_thenThrowsBusinessExceptionAndKeepsCopies() {
        // Arrange
        final Book book = bookWithCopies(2);
        this.bookAndMemberExist(book);
        Mockito.when(this.loanRepository.countByMemberIdAndReturnDateIsNull("m1"))
                .thenReturn((long) Member.MAX_ACTIVE_LOANS);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.loanService.borrow(REQUEST));

        // Assert
        Assertions.assertEquals("Ana has reached the limit of 3 active loans", thrown.getMessage());
        Assertions.assertEquals(2, book.getAvailableCopies());
    }

    @Test
    @DisplayName("Não empresta o mesmo livro duas vezes ao mesmo membro")
    void givenMemberAlreadyHasTheBook_whenBorrow_thenThrowsBusinessException() {
        // Arrange
        this.bookAndMemberExist(bookWithCopies(2));
        Mockito.when(this.loanRepository.existsByBookIdAndMemberIdAndReturnDateIsNull("b1", "m1"))
                .thenReturn(true);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.loanService.borrow(REQUEST));

        // Assert
        Assertions.assertEquals(
                "Member already has an active loan for this book", thrown.getMessage());
        Mockito.verify(this.loanRepository, Mockito.never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Não empresta livro sem exemplares disponíveis")
    void givenNoAvailableCopies_whenBorrow_thenThrowsBusinessException() {
        // Arrange
        final Book book = bookWithCopies(1);
        book.borrowCopy();
        this.bookAndMemberExist(book);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.loanService.borrow(REQUEST));

        // Assert
        Assertions.assertEquals("No copies available for this book", thrown.getMessage());
        Mockito.verify(this.loanRepository, Mockito.never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Não empresta livro inexistente")
    void givenUnknownBook_whenBorrow_thenThrowsNotFoundException() {
        // Arrange
        Mockito.when(this.bookService.findById("b1"))
                .thenThrow(new NotFoundException("Book not found: b1"));

        // Act
        final NotFoundException thrown =
                Assertions.assertThrows(
                        NotFoundException.class, () -> this.loanService.borrow(REQUEST));

        // Assert
        Assertions.assertEquals("Book not found: b1", thrown.getMessage());
        Mockito.verify(this.loanRepository, Mockito.never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Não empresta para membro inexistente")
    void givenUnknownMember_whenBorrow_thenThrowsNotFoundException() {
        // Arrange
        final Book book = bookWithCopies(2);
        Mockito.when(this.bookService.findById("b1")).thenReturn(book);
        Mockito.when(this.memberService.findById("m1"))
                .thenThrow(new NotFoundException("Member not found: m1"));

        // Act
        final NotFoundException thrown =
                Assertions.assertThrows(
                        NotFoundException.class, () -> this.loanService.borrow(REQUEST));

        // Assert
        Assertions.assertEquals("Member not found: m1", thrown.getMessage());
        Assertions.assertEquals(2, book.getAvailableCopies());
    }

    @Test
    @DisplayName("Devolução encerra o empréstimo e devolve o exemplar")
    void givenActiveLoan_whenReturnLoan_thenLoanIsClosedAndCopyGoesBack() {
        // Arrange
        final Book bookWithOneBorrowedCopy = bookWithCopies(2);
        bookWithOneBorrowedCopy.borrowCopy();
        this.loanAndBookExist(new Loan("b1", "m1", TODAY.minusDays(5)), bookWithOneBorrowedCopy);
        this.loanSaveReturnsArgument();

        // Act
        final Loan returned = this.loanService.returnLoan("l1");

        // Assert
        Assertions.assertEquals(TODAY, returned.getReturnDate());
        Assertions.assertEquals(2, bookWithOneBorrowedCopy.getAvailableCopies());
        Mockito.verify(this.bookRepository).save(bookWithOneBorrowedCopy);
    }

    @Test
    @DisplayName("Devolução de empréstimo inexistente lança NotFoundException")
    void givenUnknownLoan_whenReturnLoan_thenThrowsNotFoundException() {
        // Arrange
        Mockito.when(this.loanRepository.findById("missing")).thenReturn(Optional.empty());

        // Act
        final NotFoundException thrown =
                Assertions.assertThrows(
                        NotFoundException.class, () -> this.loanService.returnLoan("missing"));

        // Assert
        Assertions.assertEquals("Loan not found: missing", thrown.getMessage());
    }

    @Test
    @DisplayName("Não permite devolver empréstimo já devolvido")
    void givenReturnedLoan_whenReturnLoan_thenThrowsBusinessExceptionAndKeepsBook() {
        // Arrange
        final Loan returnedLoan = new Loan("b1", "m1", TODAY.minusDays(5));
        returnedLoan.markReturned(TODAY.minusDays(1));
        Mockito.when(this.loanRepository.findById("l1")).thenReturn(Optional.of(returnedLoan));

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.loanService.returnLoan("l1"));

        // Assert
        Assertions.assertEquals("Loan has already been returned", thrown.getMessage());
        Mockito.verify(this.bookRepository, Mockito.never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Lista os empréstimos do membro")
    void givenExistingMember_whenFindByMember_thenReturnsLoansOfThatMember() {
        // Arrange
        final List<Loan> loans = List.of(new Loan("b1", "m1", TODAY));
        Mockito.when(this.loanRepository.findByMemberId("m1")).thenReturn(loans);

        // Act
        final List<Loan> result = this.loanService.findByMember("m1");

        // Assert
        Assertions.assertEquals(loans, result);
    }

    @Test
    @DisplayName("Listar empréstimos de membro inexistente lança NotFoundException")
    void givenUnknownMember_whenFindByMember_thenThrowsNotFoundException() {
        // Arrange
        Mockito.when(this.memberService.findById("missing"))
                .thenThrow(new NotFoundException("Member not found: missing"));

        // Act
        final NotFoundException thrown =
                Assertions.assertThrows(
                        NotFoundException.class, () -> this.loanService.findByMember("missing"));

        // Assert
        Assertions.assertEquals("Member not found: missing", thrown.getMessage());
    }
}
