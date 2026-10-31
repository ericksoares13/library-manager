package br.ufmg.librarymanager.dto;

import java.util.Set;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("Validação de MemberRequest")
class MemberRequestTest {

    @Test
    @DisplayName("Aceita nome e e-mail válidos")
    void givenValidMemberRequest_whenValidate_thenHasNoViolations() {
        // Arrange
        final MemberRequest request = new MemberRequest("Ana", "ana@example.com");

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of(), violations);
    }

    @Test
    @DisplayName("Rejeita e-mail em formato inválido")
    void givenInvalidEmail_whenValidate_thenReportsInvalidEmail() {
        // Arrange
        final MemberRequest request = new MemberRequest("Ana", "ana.example.com");

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of("email: email must be valid"), violations);
    }

    @ParameterizedTest(name = "nome = {0}")
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("Exige nome preenchido")
    void givenBlankName_whenValidate_thenReportsRequiredName(final String blank) {
        // Arrange
        final MemberRequest request = new MemberRequest(blank, "ana@example.com");

        // Act
        final Set<String> violations = ConstraintViolations.of(request);

        // Assert
        Assertions.assertEquals(Set.of("name: name is required"), violations);
    }
}
