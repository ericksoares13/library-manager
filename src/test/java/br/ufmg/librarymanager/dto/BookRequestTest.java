package br.ufmg.librarymanager.dto;

import java.util.Set;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("Validação de BookRequest")
class BookRequestTest {

    @ParameterizedTest(name = "ISBN {0}")
    @ValueSource(strings = {"9788575201176", "8535910662", "080442957X"})
    @DisplayName("Aceita ISBN-13 e ISBN-10 válidos, inclusive com X no fim")
    void givenIsbnWithThirteenOrTenDigits_whenValidate_thenHasNoViolations(final String isbn) {
        // Arrange
        final BookRequest request = new BookRequest("Dom Casmurro", "Machado", isbn, 1);

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of(), violations);
    }

    @ParameterizedTest(name = "ISBN {0}")
    @ValueSource(strings = {"12345", "97885359106AB"})
    @DisplayName("Rejeita ISBN com tamanho errado ou com letras")
    void givenIsbnWithWrongLengthOrLetters_whenValidate_thenReportsInvalidIsbn(final String isbn) {
        // Arrange
        final BookRequest request = new BookRequest("Dom Casmurro", "Machado", isbn, 1);

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of("isbn: isbn must have 10 or 13 digits"), violations);
    }

    @ParameterizedTest(name = "ISBN {0}")
    @ValueSource(strings = {"9788575201177", "8535910663"})
    @DisplayName("Rejeita ISBN-13 e ISBN-10 com o dígito verificador errado")
    void givenIsbnWithWrongCheckDigit_whenValidate_thenReportsInvalidCheckDigit(final String isbn) {
        // Arrange
        final BookRequest request = new BookRequest("Dom Casmurro", "Machado", isbn, 1);

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of("isbn: isbn has an invalid check digit"), violations);
    }

    @ParameterizedTest(name = "título e autor = {0}")
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("Exige título e autor preenchidos")
    void givenBlankTitleAndAuthor_whenValidate_thenReportsBothFields(final String blank) {
        // Arrange
        final BookRequest request = new BookRequest(blank, blank, "9788575201176", 1);

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(
                Set.of("title: title is required", "author: author is required"), violations);
    }

    @ParameterizedTest(name = "ISBN = {0}")
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("ISBN em branco acusa só que é obrigatório")
    void givenBlankIsbn_whenValidate_thenReportsOnlyRequiredIsbn(final String blank) {
        // Arrange
        final BookRequest request = new BookRequest("Dom Casmurro", "Machado", blank, 1);

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of("isbn: isbn is required"), violations);
    }

    @Test
    @DisplayName("Exige pelo menos um exemplar")
    void givenZeroCopies_whenValidate_thenReportsMinimumCopies() {
        // Arrange
        final BookRequest request = new BookRequest("Dom Casmurro", "Machado", "9788575201176", 0);

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of("totalCopies: totalCopies must be at least 1"), violations);
    }
}
