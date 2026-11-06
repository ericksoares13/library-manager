package br.ufmg.librarymanager.dto;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

@DisplayName("Ordenação de livros")
class BookSortTest {

    @Test
    @DisplayName("Desempata pelo id para as páginas não repetirem livros")
    void givenSortByAuthor_whenToSort_thenEndsWithIdTieBreaker() {
        // Arrange
        final BookSort sort = BookSort.AUTHOR;

        // Act
        final Sort result = sort.toSort();

        // Assert
        Assertions.assertEquals(Sort.by("authorKey", "titleKey", "id"), result);
    }

    @Test
    @DisplayName("Mais recentes primeiro, sem um desempate pelo id que inverteria a ordem")
    void givenSortByRecent_whenToSort_thenOnlyIdDescending() {
        // Arrange
        final BookSort sort = BookSort.RECENT;

        // Act
        final Sort result = sort.toSort();

        // Assert
        Assertions.assertEquals(Sort.by(Sort.Direction.DESC, "id"), result);
    }
}
