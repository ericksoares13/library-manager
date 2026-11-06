package br.ufmg.librarymanager.model;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("Chave de busca")
class SearchKeyTest {

    @Test
    @DisplayName("Remove acentos, passa para minúsculas e tira os espaços das pontas")
    void givenTextWithAccentsCaseAndSpaces_whenCreateKey_thenKeyIsNormalized() {
        // Arrange
        final String text = "  Memórias Póstumas de BRÁS CUBAS ";

        // Act
        final String key = SearchKey.of(text);

        // Assert
        Assertions.assertEquals("memorias postumas de bras cubas", key);
    }

    @ParameterizedTest(name = "texto {0}")
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("Texto ausente ou em branco vira chave vazia")
    void givenBlankText_whenCreateKey_thenKeyIsEmpty(final String text) {
        // Arrange
        final String input = text;

        // Act
        final String key = SearchKey.of(input);

        // Assert
        Assertions.assertEquals("", key);
    }
}
