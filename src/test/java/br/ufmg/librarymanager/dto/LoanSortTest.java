package br.ufmg.librarymanager.dto;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

@DisplayName("Ordenação de empréstimos")
class LoanSortTest {

    @Test
    @DisplayName("Pendentes antes dos devolvidos e o id desempata para não repetir empréstimos")
    void givenSortByDueDate_whenToSort_thenPendingFirstAndIdTieBreaker() {
        // Arrange
        final LoanSort sort = LoanSort.DUE_DATE;

        // Act
        final Sort result = sort.toSort();

        // Assert
        Assertions.assertEquals(Sort.by("returnDate", "dueDate", "id"), result);
    }
}
