package br.ufmg.librarymanager.dto;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

@DisplayName("Ordenação de membros")
class MemberSortTest {

    @Test
    @DisplayName("Desempata pelo id para as páginas não repetirem membros")
    void givenSortByName_whenToSort_thenEndsWithIdTieBreaker() {
        // Arrange
        final MemberSort sort = MemberSort.NAME;

        // Act
        final Sort result = sort.toSort();

        // Assert
        Assertions.assertEquals(Sort.by("nameKey", "id"), result);
    }

    @Test
    @DisplayName("Mais recentes primeiro, sem um desempate pelo id que inverteria a ordem")
    void givenSortByRecent_whenToSort_thenOnlyIdDescending() {
        // Arrange
        final MemberSort sort = MemberSort.RECENT;

        // Act
        final Sort result = sort.toSort();

        // Assert
        Assertions.assertEquals(Sort.by(Sort.Direction.DESC, "id"), result);
    }
}
