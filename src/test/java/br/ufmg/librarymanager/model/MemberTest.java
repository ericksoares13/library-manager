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
    @DisplayName("Membro novo guarda o e-mail em minúsculas")
    void givenEmailWithUppercase_whenCreateMember_thenEmailIsLowercase() {
        // Arrange
        final String email = "Ana@Example.com";

        // Act
        final Member member = new Member("Ana", email);

        // Assert
        Assertions.assertEquals("ana@example.com", member.getEmail());
    }

    @Test
    @DisplayName("Atualiza nome, e-mail (em minúsculas) e chave de busca")
    void givenMember_whenUpdateDetails_thenNameEmailAndSearchKeyAreUpdated() {
        // Arrange
        final Member member = new Member("Ana", "ana@example.com");

        // Act
        member.updateDetails("Ana Souza", "Ana.Souza@Example.com");

        // Assert
        Assertions.assertEquals("Ana Souza", member.getName());
        Assertions.assertEquals("ana.souza@example.com", member.getEmail());
        Assertions.assertEquals(SearchKey.of("Ana Souza"), member.getNameKey());
    }

    @Test
    @DisplayName("Membro novo não tem foto")
    void givenNewMember_whenGetPhotoVersion_thenReturnsNull() {
        // Arrange
        final Member member = new Member("Ana", "ana@example.com");

        // Act
        final Integer version = member.getPhotoVersion();

        // Assert
        Assertions.assertNull(version);
    }

    @Test
    @DisplayName("Foto nova depois de remover a anterior tem outra versão")
    void givenRemovedPhoto_whenChangePhoto_thenVersionIsNotReused() {
        // Arrange
        final Member member = new Member("Ana", "ana@example.com");
        member.changePhoto();
        member.removePhoto();

        // Act
        member.changePhoto();

        // Assert
        Assertions.assertEquals(2, member.getPhotoVersion());
    }

    @Test
    @DisplayName("Remover a foto deixa o membro sem foto")
    void givenMemberWithPhoto_whenRemovePhoto_thenHasNoPhoto() {
        // Arrange
        final Member member = new Member("Ana", "ana@example.com");
        member.changePhoto();

        // Act
        member.removePhoto();

        // Assert
        Assertions.assertNull(member.getPhotoVersion());
    }
}
