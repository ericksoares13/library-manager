package br.ufmg.librarymanager.service;

import br.ufmg.librarymanager.dto.BorrowRequest;
import br.ufmg.librarymanager.dto.LoanResponse;
import br.ufmg.librarymanager.dto.LoanSort;
import br.ufmg.librarymanager.dto.LoanStatus;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.model.Loan;
import br.ufmg.librarymanager.model.Member;
import br.ufmg.librarymanager.repository.BookRepository;
import br.ufmg.librarymanager.repository.IdOnly;
import br.ufmg.librarymanager.repository.LoanFilter;
import br.ufmg.librarymanager.repository.LoanRepository;
import br.ufmg.librarymanager.repository.MemberRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("Serviço de empréstimos")
@ExtendWith(MockitoExtension.class)
class LoanServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 2);

    private static final Clock FIXED_CLOCK =
            Clock.fixed(TODAY.atStartOfDay().toInstant(ZoneOffset.UTC), ZoneId.of("UTC"));

    private static final BorrowRequest REQUEST = new BorrowRequest("b1", "m1");

    @Mock private LoanRepository loanRepository;

    @Mock private BookRepository bookRepository;

    @Mock private MemberRepository memberRepository;

    @Mock private BookService bookService;

    @Mock private MemberService memberService;

    private LoanService loanService;

    @BeforeEach
    void setUp() {
        this.loanService =
                new LoanService(
                        this.loanRepository,
                        this.bookRepository,
                        this.memberRepository,
                        this.bookService,
                        this.memberService,
                        FIXED_CLOCK);
    }

    private static Book bookWithCopies(final int totalCopies) {
        return new Book("Dom Casmurro", "Machado de Assis", "9788535910663", totalCopies);
    }

    // O id é atribuído pelo Mongo ao salvar; as entidades não têm setter
    private static <T> T withId(final T entity, final String id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    private static IdOnly idOnly(final String id) {
        return () -> id;
    }

    private void bookAndMemberExist(final Book book) {
        Mockito.when(this.bookService.findById("b1")).thenReturn(book);
        Mockito.when(this.memberService.findById("m1"))
                .thenReturn(new Member("Ana", "ana@example.com"));
    }

    private void loanBookAndMemberExist(final Loan loan, final Book book) {
        Mockito.when(this.loanRepository.findById("l1")).thenReturn(Optional.of(loan));
        Mockito.when(this.bookService.findById("b1")).thenReturn(book);
        Mockito.when(this.memberService.findById("m1"))
                .thenReturn(new Member("Ana", "ana@example.com"));
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
        final LoanResponse loan = this.loanService.borrow(REQUEST);

        // Assert
        Assertions.assertEquals("b1", loan.bookId());
        Assertions.assertEquals("m1", loan.memberId());
        Assertions.assertEquals("Dom Casmurro", loan.bookTitle());
        Assertions.assertEquals("Ana", loan.memberName());
        Assertions.assertEquals(TODAY, loan.loanDate());
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
        final LoanResponse loan = this.loanService.borrow(REQUEST);

        // Assert
        Assertions.assertEquals(TODAY, loan.loanDate());
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
        this.loanBookAndMemberExist(
                new Loan("b1", "m1", TODAY.minusDays(5)), bookWithOneBorrowedCopy);
        this.loanSaveReturnsArgument();

        // Act
        final LoanResponse returned = this.loanService.returnLoan("l1");

        // Assert
        Assertions.assertEquals(TODAY, returned.returnDate());
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
    @DisplayName("Lista a página com o título do livro, o nome do membro e o atraso")
    void givenLoansOnPage_whenSearchWithoutQuery_thenFillsTitleNameAndOverdue() {
        // Arrange
        final Book book = withId(bookWithCopies(2), "b1");
        final Member member = withId(new Member("Ana", "ana@example.com"), "m1");
        final Loan overdueLoan = new Loan("b1", "m1", TODAY.minusDays(Loan.LOAN_PERIOD_DAYS + 1));
        Mockito.when(
                        this.loanRepository.search(
                                LoanFilter.of(LoanStatus.ACTIVE, TODAY),
                                Pages.of(0, 20, LoanSort.DUE_DATE.toSort())))
                .thenReturn(new PageImpl<>(List.of(overdueLoan)));
        Mockito.when(this.bookRepository.findAllById(Set.of("b1"))).thenReturn(List.of(book));
        Mockito.when(this.memberRepository.findAllById(Set.of("m1"))).thenReturn(List.of(member));

        // Act
        final Page<LoanResponse> page =
                this.loanService.search("", LoanStatus.ACTIVE, LoanSort.DUE_DATE, 0, 20);

        // Assert
        final LoanResponse loan = page.getContent().getFirst();
        Assertions.assertEquals("Dom Casmurro", loan.bookTitle());
        Assertions.assertEquals("Ana", loan.memberName());
        Assertions.assertTrue(loan.overdue());
    }

    @Test
    @DisplayName("Busca pelos livros e membros que casam com o texto, sem acentos")
    void givenQuery_whenSearch_thenFiltersByMatchingBooksAndMembers() {
        // Arrange
        Mockito.when(
                        this.bookRepository
                                .findIdsByTitleKeyContainingOrAuthorKeyContainingOrIsbnContaining(
                                        "jose", "jose", "jose"))
                .thenReturn(List.of(idOnly("b1")));
        Mockito.when(
                        this.memberRepository.findIdsByNameKeyContainingOrEmailContainingIgnoreCase(
                                "jose", "jose"))
                .thenReturn(List.of(idOnly("m1"), idOnly("m2")));
        final LoanFilter expected =
                LoanFilter.of(LoanStatus.ALL, TODAY).matching(List.of("b1"), List.of("m1", "m2"));
        Mockito.when(
                        this.loanRepository.search(
                                ArgumentMatchers.eq(expected), ArgumentMatchers.any()))
                .thenReturn(Page.empty());

        // Act
        final Page<LoanResponse> page =
                this.loanService.search("José", LoanStatus.ALL, LoanSort.RECENT, 0, 20);

        // Assert
        Assertions.assertTrue(page.isEmpty());
    }

    @Test
    @DisplayName("Livro e membro excluídos depois da devolução ficam sem título e nome")
    void givenBookAndMemberDeleted_whenSearch_thenTitleAndNameAreNull() {
        // Arrange
        final Loan returnedLoan = new Loan("b1", "m1", TODAY.minusDays(5));
        returnedLoan.markReturned(TODAY.minusDays(1));
        Mockito.when(this.loanRepository.search(ArgumentMatchers.any(), ArgumentMatchers.any()))
                .thenReturn(new PageImpl<>(List.of(returnedLoan)));
        Mockito.when(this.bookRepository.findAllById(Set.of("b1"))).thenReturn(List.of());
        Mockito.when(this.memberRepository.findAllById(Set.of("m1"))).thenReturn(List.of());

        // Act
        final Page<LoanResponse> page =
                this.loanService.search("", LoanStatus.RETURNED, LoanSort.RECENT, 0, 20);

        // Assert
        final LoanResponse loan = page.getContent().getFirst();
        Assertions.assertNull(loan.bookTitle());
        Assertions.assertNull(loan.memberName());
    }
}
