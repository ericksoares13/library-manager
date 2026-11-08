package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.dto.LoanStatus;
import java.time.LocalDate;
import java.util.List;
import org.bson.Document;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Filtro de empréstimos")
class LoanFilterTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 2);

    @Test
    @DisplayName("Sem busca filtra só pela situação")
    void givenNoSearch_whenToCriteria_thenUsesOnlyTheStatus() {
        // Arrange
        final LoanFilter filter = LoanFilter.of(LoanStatus.ACTIVE, TODAY);

        // Act
        final Document criteria = filter.toCriteria().getCriteriaObject();

        // Assert
        Assertions.assertEquals(new Document("returnDate", null), criteria);
    }

    @Test
    @DisplayName("Com busca exige a situação e um dos livros ou membros encontrados")
    void givenSearchMatches_whenToCriteria_thenRequiresStatusAndOneOfTheMatches() {
        // Arrange
        final LoanFilter filter =
                LoanFilter.of(LoanStatus.ACTIVE, TODAY).matching(List.of("b1"), List.of("m1"));

        // Act
        final Document criteria = filter.toCriteria().getCriteriaObject();

        // Assert
        final Document matches =
                new Document(
                        "$or",
                        List.of(
                                new Document("bookId", new Document("$in", List.of("b1"))),
                                new Document("memberId", new Document("$in", List.of("m1")))));
        Assertions.assertEquals(
                new Document("$and", List.of(new Document("returnDate", null), matches)), criteria);
    }

    @Test
    @DisplayName("Na página do membro exige o membro além da situação")
    void givenMember_whenToCriteria_thenRequiresStatusAndThatMember() {
        // Arrange
        final LoanFilter filter = LoanFilter.of(LoanStatus.ACTIVE, TODAY).forMember("m1");

        // Act
        final Document criteria = filter.toCriteria().getCriteriaObject();

        // Assert
        Assertions.assertEquals(
                new Document(
                        "$and",
                        List.of(new Document("returnDate", null), new Document("memberId", "m1"))),
                criteria);
    }

    @Test
    @DisplayName("Na página do livro exige o livro além da situação")
    void givenBook_whenToCriteria_thenRequiresStatusAndThatBook() {
        // Arrange
        final LoanFilter filter = LoanFilter.of(LoanStatus.RETURNED, TODAY).forBook("b1");

        // Act
        final Document criteria = filter.toCriteria().getCriteriaObject();

        // Assert
        Assertions.assertEquals(
                new Document(
                        "$and",
                        List.of(
                                new Document("returnDate", new Document("$ne", null)),
                                new Document("bookId", "b1"))),
                criteria);
    }
}
