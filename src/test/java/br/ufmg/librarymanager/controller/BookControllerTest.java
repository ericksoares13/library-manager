package br.ufmg.librarymanager.controller;

import br.ufmg.librarymanager.dto.BookRequest;
import br.ufmg.librarymanager.dto.BookSort;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.service.BookService;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@DisplayName("API de livros")
@WebMvcTest(BookController.class)
class BookControllerTest {

    private static final String ISBN = "9788575201176";

    private static final BookRequest VALID_REQUEST =
            new BookRequest("Dom Casmurro", "Machado de Assis", ISBN, 2);

    private static final String VALID_BODY =
            """
            {"title": "Dom Casmurro", "author": "Machado de Assis",
             "isbn": "9788575201176", "totalCopies": 2}
            """;

    // Título vazio e ISBN curto: a resposta lista os dois erros, ordenados por campo
    private static final String INVALID_BODY =
            """
            {"title": "", "author": "Machado de Assis", "isbn": "123", "totalCopies": 2}
            """;

    private static final String INVALID_BODY_MESSAGE =
            "isbn: isbn must have 10 or 13 digits; title: title is required";

    @Autowired private MockMvc mockMvc;

    @MockitoBean private BookService bookService;

    private static Book bookWithId(final String id) {
        final Book book = new Book("Dom Casmurro", "Machado de Assis", ISBN, 2);
        // O id é atribuído pelo Mongo ao salvar; a entidade não tem setter
        ReflectionTestUtils.setField(book, "id", id);
        return book;
    }

    private static MockHttpServletRequestBuilder withJson(
            final MockHttpServletRequestBuilder request, final String body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private MockHttpServletResponse perform(final RequestBuilder request) throws Exception {
        return this.mockMvc.perform(request).andReturn().getResponse();
    }

    private static String body(final MockHttpServletResponse response) throws Exception {
        return response.getContentAsString(StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("Lista a página pedida com a busca e a ordem")
    void givenQuerySortAndPage_whenGetBooks_thenRespondsWithThatPage() throws Exception {
        // Arrange
        Mockito.when(this.bookService.search("machado", BookSort.AUTHOR, 1, 5))
                .thenReturn(
                        new PageImpl<>(
                                List.of(bookWithId("b6"), bookWithId("b7")),
                                PageRequest.of(1, 5),
                                7));

        // Act
        final MockHttpServletResponse response =
                this.perform(
                        MockMvcRequestBuilders.get(
                                "/api/books?q=machado&sort=AUTHOR&page=1&size=5"));

        // Assert
        final String json = body(response);
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals(List.of("b6", "b7"), JsonPath.read(json, "$.items[*].id"));
        Assertions.assertEquals(1, (int) JsonPath.read(json, "$.page"));
        Assertions.assertEquals(5, (int) JsonPath.read(json, "$.size"));
        Assertions.assertEquals(7, (int) JsonPath.read(json, "$.totalItems"));
        Assertions.assertEquals(2, (int) JsonPath.read(json, "$.totalPages"));
    }

    @Test
    @DisplayName("Sem parâmetros lista a primeira página por título")
    void givenNoParameters_whenGetBooks_thenUsesTheDefaults() throws Exception {
        // Arrange
        Mockito.when(this.bookService.search("", BookSort.TITLE, 0, 20))
                .thenReturn(new PageImpl<>(List.of(bookWithId("b1"))));

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.get("/api/books"));

        // Assert
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals(List.of("b1"), JsonPath.read(body(response), "$.items[*].id"));
    }

    @Test
    @DisplayName("Ordenação desconhecida responde 400 sem chamar o serviço")
    void givenUnknownSort_whenGetBooks_thenRespondsWith400() throws Exception {
        // Arrange
        final String url = "/api/books?sort=FOO";

        // Act
        final MockHttpServletResponse response = this.perform(MockMvcRequestBuilders.get(url));

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        Assertions.assertEquals(
                "Invalid value for parameter sort", JsonPath.read(body(response), "$.message"));
        Mockito.verifyNoInteractions(this.bookService);
    }

    @Test
    @DisplayName("Busca livro pelo id com todos os campos")
    void givenExistingId_whenGetBook_thenRespondsWithTheBookFields() throws Exception {
        // Arrange
        final Book book = bookWithId("b1");
        book.borrowCopy();
        Mockito.when(this.bookService.findById("b1")).thenReturn(book);

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.get("/api/books/b1"));

        // Assert
        final String json = body(response);
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals("b1", JsonPath.read(json, "$.id"));
        Assertions.assertEquals("Dom Casmurro", JsonPath.read(json, "$.title"));
        Assertions.assertEquals("Machado de Assis", JsonPath.read(json, "$.author"));
        Assertions.assertEquals(ISBN, JsonPath.read(json, "$.isbn"));
        Assertions.assertEquals(2, (int) JsonPath.read(json, "$.totalCopies"));
        Assertions.assertEquals(1, (int) JsonPath.read(json, "$.availableCopies"));
    }

    @Test
    @DisplayName("Livro inexistente responde 404 com a mensagem")
    void givenUnknownId_whenGetBook_thenRespondsWith404() throws Exception {
        // Arrange
        Mockito.when(this.bookService.findById("missing"))
                .thenThrow(new NotFoundException("Book not found: missing"));

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.get("/api/books/missing"));

        // Assert
        Assertions.assertEquals(HttpStatus.NOT_FOUND.value(), response.getStatus());
        Assertions.assertEquals(
                "Book not found: missing", JsonPath.read(body(response), "$.message"));
    }

    @Test
    @DisplayName("Cadastro responde 201 com o endereço do novo livro")
    void givenValidBody_whenPostBook_thenRespondsWith201AndLocation() throws Exception {
        // Arrange
        Mockito.when(this.bookService.create(VALID_REQUEST)).thenReturn(bookWithId("b1"));

        // Act
        final MockHttpServletResponse response =
                this.perform(withJson(MockMvcRequestBuilders.post("/api/books"), VALID_BODY));

        // Assert
        Assertions.assertEquals(HttpStatus.CREATED.value(), response.getStatus());
        Assertions.assertEquals("/api/books/b1", response.getHeader(HttpHeaders.LOCATION));
        Assertions.assertEquals("b1", JsonPath.read(body(response), "$.id"));
    }

    @Test
    @DisplayName("Cadastro inválido responde 400 sem chamar o serviço")
    void givenInvalidBody_whenPostBook_thenRespondsWith400AndDoesNotCreate() throws Exception {
        // Arrange
        final MockHttpServletRequestBuilder request =
                withJson(MockMvcRequestBuilders.post("/api/books"), INVALID_BODY);

        // Act
        final MockHttpServletResponse response = this.perform(request);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        Assertions.assertEquals(INVALID_BODY_MESSAGE, JsonPath.read(body(response), "$.message"));
        Mockito.verify(this.bookService, Mockito.never()).create(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Regra de negócio violada responde 409 com a mensagem")
    void givenDuplicatedIsbn_whenPostBook_thenRespondsWith409() throws Exception {
        // Arrange
        Mockito.when(this.bookService.create(VALID_REQUEST))
                .thenThrow(new BusinessException("A book with ISBN " + ISBN + " already exists"));

        // Act
        final MockHttpServletResponse response =
                this.perform(withJson(MockMvcRequestBuilders.post("/api/books"), VALID_BODY));

        // Assert
        Assertions.assertEquals(HttpStatus.CONFLICT.value(), response.getStatus());
        Assertions.assertEquals(
                "A book with ISBN " + ISBN + " already exists",
                JsonPath.read(body(response), "$.message"));
    }

    @Test
    @DisplayName("Atualização responde com o livro atualizado")
    void givenValidBody_whenPutBook_thenRespondsWithTheUpdatedBook() throws Exception {
        // Arrange
        Mockito.when(this.bookService.update("b1", VALID_REQUEST)).thenReturn(bookWithId("b1"));

        // Act
        final MockHttpServletResponse response =
                this.perform(withJson(MockMvcRequestBuilders.put("/api/books/b1"), VALID_BODY));

        // Assert
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals("b1", JsonPath.read(body(response), "$.id"));
    }

    @Test
    @DisplayName("Atualização inválida responde 400 sem chamar o serviço")
    void givenInvalidBody_whenPutBook_thenRespondsWith400AndDoesNotUpdate() throws Exception {
        // Arrange
        final MockHttpServletRequestBuilder request =
                withJson(MockMvcRequestBuilders.put("/api/books/b1"), INVALID_BODY);

        // Act
        final MockHttpServletResponse response = this.perform(request);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        Mockito.verify(this.bookService, Mockito.never())
                .update(ArgumentMatchers.any(), ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Exclusão responde 204 e remove o livro")
    void givenExistingId_whenDeleteBook_thenRespondsWith204() throws Exception {
        // Arrange
        final String id = "b1";

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.delete("/api/books/" + id));

        // Assert
        Assertions.assertEquals(HttpStatus.NO_CONTENT.value(), response.getStatus());
        Mockito.verify(this.bookService).delete(id);
    }
}
