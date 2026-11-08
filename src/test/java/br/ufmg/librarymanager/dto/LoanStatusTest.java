package br.ufmg.librarymanager.dto;

import java.time.LocalDate;
import org.bson.Document;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Situação dos empréstimos")
class LoanStatusTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 2);

    @Test
    @DisplayName("Ativos são os não devolvidos, atrasados ou não")
    void givenActive_whenToCriteria_thenMatchesLoansWithoutReturnDate() {
        // Arrange
        final LoanStatus status = LoanStatus.ACTIVE;

        // Act
        final Document criteria = status.toCriteria(TODAY).getCriteriaObject();

        // Assert
        Assertions.assertEquals(new Document("returnDate", null), criteria);
    }

    @Test
    @DisplayName("Atrasados são os não devolvidos com vencimento antes de hoje")
    void givenOverdue_whenToCriteria_thenMatchesActiveLoansDueBeforeToday() {
        // Arrange
        final LoanStatus status = LoanStatus.OVERDUE;

        // Act
        final Document criteria = status.toCriteria(TODAY).getCriteriaObject();

        // Assert
        Assertions.assertEquals(
                new Document("returnDate", null).append("dueDate", new Document("$lt", TODAY)),
                criteria);
    }

    @Test
    @DisplayName("Devolvidos são os que têm data de devolução")
    void givenReturned_whenToCriteria_thenMatchesLoansWithReturnDate() {
        // Arrange
        final LoanStatus status = LoanStatus.RETURNED;

        // Act
        final Document criteria = status.toCriteria(TODAY).getCriteriaObject();

        // Assert
        Assertions.assertEquals(new Document("returnDate", new Document("$ne", null)), criteria);
    }

    @Test
    @DisplayName("Todos não filtra nada")
    void givenAll_whenToCriteria_thenMatchesEveryLoan() {
        // Arrange
        final LoanStatus status = LoanStatus.ALL;

        // Act
        final Document criteria = status.toCriteria(TODAY).getCriteriaObject();

        // Assert
        Assertions.assertEquals(new Document(), criteria);
    }
}
