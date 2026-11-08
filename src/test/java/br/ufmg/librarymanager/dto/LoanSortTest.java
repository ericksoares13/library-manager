package br.ufmg.librarymanager.dto;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

@DisplayName("Ordenação de empréstimos")
class LoanSortTest {

    @Test
    @DisplayName("Desempata pelo id para as páginas não repetirem empréstimos")
    void givenSortByDueDate_whenToSort_thenEndsWithIdTieBreaker() {
        // Arrange
        final LoanSort sort = LoanSort.DUE_DATE;

        // Act
        final Sort result = sort.toSort();

        // Assert
        Assertions.assertEquals(Sort.by("dueDate", "id"), result);
    }
}
