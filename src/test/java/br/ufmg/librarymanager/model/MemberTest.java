package br.ufmg.librarymanager.model;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Membro")
class MemberTest {

    @Test
    @DisplayName("Membro novo já tem a chave de busca do nome")
    void givenName_whenCreateMember_thenSearchKeyComesFromTheName() {
        // Arrange
        final String name = "Ana Souza";

        // Act
        final Member member = new Member(name, "ana@example.com");

        // Assert
        Assertions.assertEquals(SearchKey.of(name), member.getNameKey());
    }

    @Test
    @DisplayName("Atualiza nome e e-mail junto com a chave de busca")
    void givenMember_whenUpdateDetails_thenNameEmailAndSearchKeyAreUpdated() {
        // Arrange
        final Member member = new Member("Ana", "ana@example.com");

        // Act
        member.updateDetails("Ana Souza", "ana.souza@example.com");

        // Assert
        Assertions.assertEquals("Ana Souza", member.getName());
        Assertions.assertEquals("ana.souza@example.com", member.getEmail());
        Assertions.assertEquals(SearchKey.of("Ana Souza"), member.getNameKey());
    }
}
