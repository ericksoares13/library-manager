package br.ufmg.librarymanager.service;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@DisplayName("Página pedida")
class PagesTest {

    private static final Sort SORT = Sort.by("titleKey");

    @Test
    @DisplayName("Usa a página, o tamanho e a ordem pedidos quando são válidos")
    void givenValidPageAndSize_whenCreate_thenKeepsThem() {
        // Arrange
        final int page = 2;

        // Act
        final Pageable pageable = Pages.of(page, 20, SORT);

        // Assert
        Assertions.assertEquals(PageRequest.of(2, 20, SORT), pageable);
    }

    // Limites: página negativa → 0; tamanho 0 → 1; tamanho acima do máximo → máximo
    @ParameterizedTest(name = "página {0}, tamanho {1}")
    @CsvSource({"-1, 20, 0, 20", "0, 0, 0, 1", "0, 101, 0, 100"})
    @DisplayName("Corrige página e tamanho fora do intervalo em vez de falhar")
    void givenOutOfRangeValues_whenCreate_thenClampsThem(
            final int page, final int size, final int expectedPage, final int expectedSize) {
        // Arrange
        final int requestedSize = size;

        // Act
        final Pageable pageable = Pages.of(page, requestedSize, SORT);

        // Assert
        Assertions.assertEquals(PageRequest.of(expectedPage, expectedSize, SORT), pageable);
    }
}
