package br.ufmg.librarymanager.model;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Membro")
class MemberTest {

    @Test
    @DisplayName("Atualiza nome e e-mail")
    void givenMember_whenUpdateDetails_thenNameAndEmailAreUpdated() {
        // Arrange
        final Member member = new Member("Ana", "ana@example.com");

        // Act
        member.updateDetails("Ana Souza", "ana.souza@example.com");

        // Assert
        Assertions.assertEquals("Ana Souza", member.getName());
        Assertions.assertEquals("ana.souza@example.com", member.getEmail());
    }
}
