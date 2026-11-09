package br.ufmg.librarymanager.controller;

import br.ufmg.librarymanager.dto.BorrowRequest;
import br.ufmg.librarymanager.dto.LoanResponse;
import br.ufmg.librarymanager.dto.LoanSort;
import br.ufmg.librarymanager.dto.LoanStatus;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.service.LoanService;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@DisplayName("API de empréstimos")
@WebMvcTest(LoanController.class)
class LoanControllerTest {

    private static final LocalDate LOAN_DATE = LocalDate.of(2026, 3, 2);

    @Autowired private MockMvc mockMvc;

    @MockitoBean private LoanService loanService;

    private static LoanResponse loan(final String id, final LocalDate returnDate) {
        return new LoanResponse(
                id,
                "b1",
                "Dom Casmurro",
                "9788575201176",
                "m1",
                "Ana",
                null,
                LOAN_DATE,
                LOAN_DATE.plusDays(14),
                returnDate,
                false);
    }

    private static MockHttpServletRequestBuilder borrowWith(final String body) {
        return MockMvcRequestBuilders.post("/api/loans")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private MockHttpServletResponse perform(final RequestBuilder request) throws Exception {
        return this.mockMvc.perform(request).andReturn().getResponse();
    }

    private static String body(final MockHttpServletResponse response) throws Exception {
        return response.getContentAsString(StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("Lista a página pedida com a busca, a situação, a ordem, o membro e o livro")
    void givenQueryStatusSortAndPage_whenGetLoans_thenRespondsWithThatPage() throws Exception {
        // Arrange
        Mockito.when(
                        this.loanService.search(
                                "ana", LoanStatus.OVERDUE, LoanSort.RECENT, 1, 5, "m1", "b1"))
                .thenReturn(new PageImpl<>(List.of(loan("l6", null)), PageRequest.of(1, 5), 6));

        // Act
        final MockHttpServletResponse response =
                this.perform(
                        MockMvcRequestBuilders.get(
                                "/api/loans?q=ana&status=OVERDUE&sort=RECENT"
                                        + "&page=1&size=5&memberId=m1&bookId=b1"));

        // Assert
        final String json = body(response);
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals(List.of("l6"), JsonPath.read(json, "$.items[*].id"));
        Assertions.assertEquals(6, (int) JsonPath.read(json, "$.totalItems"));
    }

    @Test
    @DisplayName("Sem parâmetros lista os ativos por vencimento, com todos os campos")
    void givenNoParameters_whenGetLoans_thenListsActiveLoansByDueDate() throws Exception {
        // Arrange
        Mockito.when(
                        this.loanService.search(
                                "", LoanStatus.ACTIVE, LoanSort.DUE_DATE, 0, 20, null, null))
                .thenReturn(new PageImpl<>(List.of(loan("l1", null))));

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.get("/api/loans"));

        // Assert
        final String json = body(response);
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals("l1", JsonPath.read(json, "$.items[0].id"));
        Assertions.assertEquals("b1", JsonPath.read(json, "$.items[0].bookId"));
        Assertions.assertEquals("Dom Casmurro", JsonPath.read(json, "$.items[0].bookTitle"));
        Assertions.assertEquals("m1", JsonPath.read(json, "$.items[0].memberId"));
        Assertions.assertEquals("Ana", JsonPath.read(json, "$.items[0].memberName"));
        Assertions.assertEquals("2026-03-02", JsonPath.read(json, "$.items[0].loanDate"));
        Assertions.assertEquals("2026-03-16", JsonPath.read(json, "$.items[0].dueDate"));
        Assertions.assertNull(JsonPath.read(json, "$.items[0].returnDate"));
        Assertions.assertFalse((boolean) JsonPath.read(json, "$.items[0].overdue"));
    }

    @Test
    @DisplayName("Situação desconhecida responde 400 sem chamar o serviço")
    void givenUnknownStatus_whenGetLoans_thenRespondsWith400() throws Exception {
        // Arrange
        final String url = "/api/loans?status=LOST";

        // Act
        final MockHttpServletResponse response = this.perform(MockMvcRequestBuilders.get(url));

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        Assertions.assertEquals(
                "Invalid value for parameter status", JsonPath.read(body(response), "$.message"));
        Mockito.verifyNoInteractions(this.loanService);
    }

    @Test
    @DisplayName("Empréstimo responde 201 com o novo empréstimo")
    void givenValidBody_whenPostLoan_thenRespondsWith201() throws Exception {
        // Arrange
        Mockito.when(this.loanService.borrow(new BorrowRequest("b1", "m1")))
                .thenReturn(loan("l1", null));

        // Act
        final MockHttpServletResponse response =
                this.perform(borrowWith("{\"bookId\": \"b1\", \"memberId\": \"m1\"}"));

        // Assert
        Assertions.assertEquals(HttpStatus.CREATED.value(), response.getStatus());
        Assertions.assertEquals("l1", JsonPath.read(body(response), "$.id"));
    }

    @Test
    @DisplayName("Empréstimo inválido responde 400 sem chamar o serviço")
    void givenMissingMember_whenPostLoan_thenRespondsWith400AndDoesNotBorrow() throws Exception {
        // Arrange
        final MockHttpServletRequestBuilder request = borrowWith("{\"bookId\": \"b1\"}");

        // Act
        final MockHttpServletResponse response = this.perform(request);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        Assertions.assertEquals(
                "memberId: memberId is required", JsonPath.read(body(response), "$.message"));
        Mockito.verify(this.loanService, Mockito.never()).borrow(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Regra de negócio violada responde 409 com a mensagem")
    void givenMemberAtLoanLimit_whenPostLoan_thenRespondsWith409() throws Exception {
        // Arrange
        Mockito.when(this.loanService.borrow(new BorrowRequest("b1", "m1")))
                .thenThrow(new BusinessException("Ana has reached the limit of 3 active loans"));

        // Act
        final MockHttpServletResponse response =
                this.perform(borrowWith("{\"bookId\": \"b1\", \"memberId\": \"m1\"}"));

        // Assert
        Assertions.assertEquals(HttpStatus.CONFLICT.value(), response.getStatus());
        Assertions.assertEquals(
                "Ana has reached the limit of 3 active loans",
                JsonPath.read(body(response), "$.message"));
    }

    @Test
    @DisplayName("Devolução responde com o empréstimo encerrado")
    void givenActiveLoan_whenPostReturn_thenRespondsWithTheReturnedLoan() throws Exception {
        // Arrange
        Mockito.when(this.loanService.returnLoan("l1"))
                .thenReturn(loan("l1", LOAN_DATE.plusDays(3)));

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.post("/api/loans/l1/return"));

        // Assert
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals("2026-03-05", JsonPath.read(body(response), "$.returnDate"));
    }

    @Test
    @DisplayName("Empréstimo inexistente responde 404 com a mensagem")
    void givenUnknownLoan_whenPostReturn_thenRespondsWith404() throws Exception {
        // Arrange
        Mockito.when(this.loanService.returnLoan("missing"))
                .thenThrow(new NotFoundException("Loan not found: missing"));

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.post("/api/loans/missing/return"));

        // Assert
        Assertions.assertEquals(HttpStatus.NOT_FOUND.value(), response.getStatus());
        Assertions.assertEquals(
                "Loan not found: missing", JsonPath.read(body(response), "$.message"));
    }
}
