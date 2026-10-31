package br.ufmg.librarymanager.dto;

import java.util.Set;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("Validação de BorrowRequest")
class BorrowRequestTest {

    @Test
    @DisplayName("Aceita requisição com livro e membro")
    void givenBookAndMember_whenValidate_thenHasNoViolations() {
        // Arrange
        final BorrowRequest request = new BorrowRequest("b1", "m1");

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of(), violations);
    }

    @ParameterizedTest(name = "livro e membro = {0}")
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("Exige livro e membro preenchidos")
    void givenBlankBookAndMember_whenValidate_thenReportsBothFields(final String blank) {
        // Arrange
        final BorrowRequest request = new BorrowRequest(blank, blank);

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(
                Set.of("bookId: bookId is required", "memberId: memberId is required"), violations);
    }
}
