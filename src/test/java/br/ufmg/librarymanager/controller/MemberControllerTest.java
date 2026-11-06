package br.ufmg.librarymanager.controller;

import br.ufmg.librarymanager.dto.MemberRequest;
import br.ufmg.librarymanager.dto.MemberSort;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Member;
import br.ufmg.librarymanager.service.MemberService;
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

@DisplayName("API de membros")
@WebMvcTest(MemberController.class)
class MemberControllerTest {

    private static final String EMAIL = "ana@example.com";

    private static final MemberRequest VALID_REQUEST = new MemberRequest("Ana Souza", EMAIL);

    private static final String VALID_BODY =
            """
            {"name": "Ana Souza", "email": "ana@example.com"}
            """;

    // Nome vazio e e-mail inválido: a resposta lista os dois erros, ordenados por campo
    private static final String INVALID_BODY =
            """
            {"name": "", "email": "ana"}
            """;

    private static final String INVALID_BODY_MESSAGE =
            "email: email must be valid; name: name is required";

    @Autowired private MockMvc mockMvc;

    @MockitoBean private MemberService memberService;

    private static Member memberWithId(final String id) {
        final Member member = new Member("Ana Souza", EMAIL);
        // O id é atribuído pelo Mongo ao salvar; a entidade não tem setter
        ReflectionTestUtils.setField(member, "id", id);
        return member;
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
    void givenQuerySortAndPage_whenGetMembers_thenRespondsWithThatPage() throws Exception {
        // Arrange
        Mockito.when(this.memberService.search("ana", MemberSort.EMAIL, 2, 10))
                .thenReturn(
                        new PageImpl<>(List.of(memberWithId("m21")), PageRequest.of(2, 10), 21));

        // Act
        final MockHttpServletResponse response =
                this.perform(
                        MockMvcRequestBuilders.get("/api/members?q=ana&sort=EMAIL&page=2&size=10"));

        // Assert
        final String json = body(response);
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals(List.of("m21"), JsonPath.read(json, "$.items[*].id"));
        Assertions.assertEquals(2, (int) JsonPath.read(json, "$.page"));
        Assertions.assertEquals(21, (int) JsonPath.read(json, "$.totalItems"));
        Assertions.assertEquals(3, (int) JsonPath.read(json, "$.totalPages"));
    }

    @Test
    @DisplayName("Sem parâmetros lista a primeira página por nome")
    void givenNoParameters_whenGetMembers_thenUsesTheDefaults() throws Exception {
        // Arrange
        Mockito.when(this.memberService.search("", MemberSort.NAME, 0, 20))
                .thenReturn(new PageImpl<>(List.of(memberWithId("m1"))));

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.get("/api/members"));

        // Assert
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals(List.of("m1"), JsonPath.read(body(response), "$.items[*].id"));
    }

    @Test
    @DisplayName("Busca membro pelo id com todos os campos")
    void givenExistingId_whenGetMember_thenRespondsWithTheMemberFields() throws Exception {
        // Arrange
        Mockito.when(this.memberService.findById("m1")).thenReturn(memberWithId("m1"));

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.get("/api/members/m1"));

        // Assert
        final String json = body(response);
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals("m1", JsonPath.read(json, "$.id"));
        Assertions.assertEquals("Ana Souza", JsonPath.read(json, "$.name"));
        Assertions.assertEquals(EMAIL, JsonPath.read(json, "$.email"));
    }

    @Test
    @DisplayName("Membro inexistente responde 404 com a mensagem")
    void givenUnknownId_whenGetMember_thenRespondsWith404() throws Exception {
        // Arrange
        Mockito.when(this.memberService.findById("missing"))
                .thenThrow(new NotFoundException("Member not found: missing"));

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.get("/api/members/missing"));

        // Assert
        Assertions.assertEquals(HttpStatus.NOT_FOUND.value(), response.getStatus());
        Assertions.assertEquals(
                "Member not found: missing", JsonPath.read(body(response), "$.message"));
    }

    @Test
    @DisplayName("Cadastro responde 201 com o endereço do novo membro")
    void givenValidBody_whenPostMember_thenRespondsWith201AndLocation() throws Exception {
        // Arrange
        Mockito.when(this.memberService.create(VALID_REQUEST)).thenReturn(memberWithId("m1"));

        // Act
        final MockHttpServletResponse response =
                this.perform(withJson(MockMvcRequestBuilders.post("/api/members"), VALID_BODY));

        // Assert
        Assertions.assertEquals(HttpStatus.CREATED.value(), response.getStatus());
        Assertions.assertEquals("/api/members/m1", response.getHeader(HttpHeaders.LOCATION));
        Assertions.assertEquals("m1", JsonPath.read(body(response), "$.id"));
    }

    @Test
    @DisplayName("Cadastro inválido responde 400 sem chamar o serviço")
    void givenInvalidBody_whenPostMember_thenRespondsWith400AndDoesNotCreate() throws Exception {
        // Arrange
        final MockHttpServletRequestBuilder request =
                withJson(MockMvcRequestBuilders.post("/api/members"), INVALID_BODY);

        // Act
        final MockHttpServletResponse response = this.perform(request);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        Assertions.assertEquals(INVALID_BODY_MESSAGE, JsonPath.read(body(response), "$.message"));
        Mockito.verify(this.memberService, Mockito.never()).create(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("JSON malformado responde 400 no formato da API")
    void givenMalformedJson_whenPostMember_thenRespondsWith400AndDoesNotCreate() throws Exception {
        // Arrange
        final MockHttpServletRequestBuilder request =
                withJson(MockMvcRequestBuilders.post("/api/members"), "{\"name\": ");

        // Act
        final MockHttpServletResponse response = this.perform(request);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        Assertions.assertEquals(
                "Malformed request body", JsonPath.read(body(response), "$.message"));
        Mockito.verify(this.memberService, Mockito.never()).create(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Regra de negócio violada responde 409 com a mensagem")
    void givenDuplicatedEmail_whenPostMember_thenRespondsWith409() throws Exception {
        // Arrange
        Mockito.when(this.memberService.create(VALID_REQUEST))
                .thenThrow(
                        new BusinessException("A member with email " + EMAIL + " already exists"));

        // Act
        final MockHttpServletResponse response =
                this.perform(withJson(MockMvcRequestBuilders.post("/api/members"), VALID_BODY));

        // Assert
        Assertions.assertEquals(HttpStatus.CONFLICT.value(), response.getStatus());
        Assertions.assertEquals(
                "A member with email " + EMAIL + " already exists",
                JsonPath.read(body(response), "$.message"));
    }

    @Test
    @DisplayName("Atualização responde com o membro atualizado")
    void givenValidBody_whenPutMember_thenRespondsWithTheUpdatedMember() throws Exception {
        // Arrange
        Mockito.when(this.memberService.update("m1", VALID_REQUEST)).thenReturn(memberWithId("m1"));

        // Act
        final MockHttpServletResponse response =
                this.perform(withJson(MockMvcRequestBuilders.put("/api/members/m1"), VALID_BODY));

        // Assert
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatus());
        Assertions.assertEquals("m1", JsonPath.read(body(response), "$.id"));
    }

    @Test
    @DisplayName("Atualização inválida responde 400 sem chamar o serviço")
    void givenInvalidBody_whenPutMember_thenRespondsWith400AndDoesNotUpdate() throws Exception {
        // Arrange
        final MockHttpServletRequestBuilder request =
                withJson(MockMvcRequestBuilders.put("/api/members/m1"), INVALID_BODY);

        // Act
        final MockHttpServletResponse response = this.perform(request);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        Mockito.verify(this.memberService, Mockito.never())
                .update(ArgumentMatchers.any(), ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Exclusão responde 204 e remove o membro")
    void givenExistingId_whenDeleteMember_thenRespondsWith204() throws Exception {
        // Arrange
        final String id = "m1";

        // Act
        final MockHttpServletResponse response =
                this.perform(MockMvcRequestBuilders.delete("/api/members/" + id));

        // Assert
        Assertions.assertEquals(HttpStatus.NO_CONTENT.value(), response.getStatus());
        Mockito.verify(this.memberService).delete(id);
    }
}
