package br.ufmg.librarymanager.model;

import br.ufmg.librarymanager.exception.BusinessException;
import java.time.LocalDate;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Empréstimo")
class LoanTest {

    private static final LocalDate LOAN_DATE = LocalDate.of(2026, 3, 2);

    private static Loan newLoan() {
        return new Loan("book-1", "member-1", LOAN_DATE);
    }

    @Test
    @DisplayName("Vencimento é 14 dias após o empréstimo")
    void givenLoanDate_whenCreateLoan_thenDueDateIsFourteenDaysLater() {
        // Arrange
        final LocalDate expectedDueDate = LocalDate.of(2026, 3, 16);

        // Act
        final Loan loan = newLoan();

        // Assert
        Assertions.assertEquals(expectedDueDate, loan.getDueDate());
    }

    @Test
    @DisplayName("Empréstimo novo ainda não foi devolvido")
    void givenNewLoan_whenCheckReturned_thenLoanIsNotReturned() {
        // Arrange
        final Loan loan = newLoan();

        // Act
        final boolean returned = loan.isReturned();

        // Assert
        Assertions.assertFalse(returned);
        Assertions.assertNull(loan.getReturnDate());
    }

    @Test
    @DisplayName("Devolução registra a data")
    void givenActiveLoan_whenMarkReturned_thenReturnDateIsRecorded() {
        // Arrange
        final Loan loan = newLoan();
        final LocalDate returnDate = LocalDate.of(2026, 3, 10);

        // Act
        loan.markReturned(returnDate);

        // Assert
        Assertions.assertTrue(loan.isReturned());
        Assertions.assertEquals(returnDate, loan.getReturnDate());
    }

    @Test
    @DisplayName("Aceita devolução no próprio dia do empréstimo")
    void givenActiveLoan_whenMarkReturnedOnLoanDate_thenReturnIsAccepted() {
        // Arrange
        final Loan loan = newLoan();

        // Act
        loan.markReturned(LOAN_DATE);

        // Assert
        Assertions.assertEquals(LOAN_DATE, loan.getReturnDate());
    }

    @Test
    @DisplayName("Não permite devolver duas vezes")
    void givenReturnedLoan_whenMarkReturned_thenThrowsBusinessException() {
        // Arrange
        final Loan loan = newLoan();
        loan.markReturned(LocalDate.of(2026, 3, 10));

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class,
                        () -> loan.markReturned(LocalDate.of(2026, 3, 11)));

        // Assert
        Assertions.assertEquals("Loan has already been returned", thrown.getMessage());
    }

    @Test
    @DisplayName("Não aceita devolução antes da data do empréstimo")
    void givenDateBeforeLoanDate_whenMarkReturned_thenThrowsBusinessException() {
        // Arrange
        final Loan loan = newLoan();
        final LocalDate dayBeforeLoan = LOAN_DATE.minusDays(1);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> loan.markReturned(dayBeforeLoan));

        // Assert
        Assertions.assertEquals("returnDate cannot be before loanDate", thrown.getMessage());
    }

    @Test
    @DisplayName("Não está atrasado no dia do vencimento")
    void givenActiveLoan_whenCheckOverdueOnDueDate_thenLoanIsNotOverdue() {
        // Arrange
        final Loan loan = newLoan();

        // Act
        final boolean overdue = loan.isOverdue(loan.getDueDate());

        // Assert
        Assertions.assertFalse(overdue);
    }

    @Test
    @DisplayName("Está atrasado após o vencimento")
    void givenActiveLoan_whenCheckOverdueAfterDueDate_thenLoanIsOverdue() {
        // Arrange
        final Loan loan = newLoan();

        // Act
        final boolean overdue = loan.isOverdue(loan.getDueDate().plusDays(1));

        // Assert
        Assertions.assertTrue(overdue);
    }

    @Test
    @DisplayName("Empréstimo devolvido nunca fica atrasado")
    void givenReturnedLoan_whenCheckOverdueAfterDueDate_thenLoanIsNotOverdue() {
        // Arrange
        final Loan loan = newLoan();
        loan.markReturned(loan.getDueDate().plusDays(5));

        // Act
        final boolean overdue = loan.isOverdue(loan.getDueDate().plusDays(10));

        // Assert
        Assertions.assertFalse(overdue);
    }
}
