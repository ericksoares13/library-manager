package br.ufmg.librarymanager.exception;

import java.lang.reflect.Method;
import java.util.Arrays;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@DisplayName("Tratamento de erros da API")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        this.handler = new GlobalExceptionHandler();
    }

    private static MethodArgumentNotValidException invalidRequest(final FieldError... errors)
            throws NoSuchMethodException {
        final BeanPropertyBindingResult result =
                new BeanPropertyBindingResult(new Object(), "request");
        Arrays.stream(errors).forEach(result::addError);
        final Method method = Object.class.getMethod("equals", Object.class);
        return new MethodArgumentNotValidException(new MethodParameter(method, 0), result);
    }

    @Test
    @DisplayName("Recurso não encontrado responde 404")
    void givenNotFoundException_whenHandle_thenRespondsWith404() {
        // Arrange
        final NotFoundException exception = new NotFoundException("Book not found: b1");

        // Act
        final ResponseEntity<ApiError> response = this.handler.handleNotFound(exception);

        // Assert
        Assertions.assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        Assertions.assertEquals(new ApiError("Book not found: b1"), response.getBody());
    }

    @Test
    @DisplayName("Violação de regra de negócio responde 409")
    void givenBusinessException_whenHandle_thenRespondsWith409() {
        // Arrange
        final BusinessException exception = new BusinessException("No copies available");

        // Act
        final ResponseEntity<ApiError> response = this.handler.handleBusiness(exception);

        // Assert
        Assertions.assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Assertions.assertEquals(new ApiError("No copies available"), response.getBody());
    }

    @Test
    @DisplayName("Chave única repetida no banco responde 409")
    void givenDuplicateKeyException_whenHandle_thenRespondsWith409() {
        // Arrange
        final DuplicateKeyException exception = new DuplicateKeyException("E11000 duplicate key");

        // Act
        final ResponseEntity<ApiError> response = this.handler.handleDuplicateKey(exception);

        // Assert
        Assertions.assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        Assertions.assertEquals(
                new ApiError("A record with the same unique value already exists"),
                response.getBody());
    }

    @Test
    @DisplayName("Erros de validação saem ordenados por campo")
    void givenSeveralFieldErrors_whenHandleValidation_thenMessagesAreSortedByField()
            throws NoSuchMethodException {
        // Arrange
        final MethodArgumentNotValidException exception =
                invalidRequest(
                        new FieldError("request", "title", "title is required"),
                        new FieldError("request", "author", "author is required"));

        // Act
        final ResponseEntity<ApiError> response = this.handler.handleValidation(exception);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Assertions.assertEquals(
                new ApiError("author: author is required; title: title is required"),
                response.getBody());
    }

    @Test
    @DisplayName("Parâmetro da URL com valor inválido responde 400 com o nome dele")
    void givenTypeMismatch_whenHandle_thenRespondsWith400NamingTheParameter() {
        // Arrange
        final MethodArgumentTypeMismatchException exception =
                new MethodArgumentTypeMismatchException("FOO", Object.class, "sort", null, null);

        // Act
        final ResponseEntity<ApiError> response = this.handler.handleTypeMismatch(exception);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Assertions.assertEquals(
                new ApiError("Invalid value for parameter sort"), response.getBody());
    }

    @Test
    @DisplayName("Corpo ilegível responde 400 com mensagem padrão")
    void givenUnreadableBody_whenHandle_thenRespondsWith400() {
        // Arrange
        final HttpMessageNotReadableException exception =
                new HttpMessageNotReadableException(
                        "JSON parse error", new MockHttpInputMessage(new byte[0]));

        // Act
        final ResponseEntity<ApiError> response = this.handler.handleUnreadableBody(exception);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Assertions.assertEquals(new ApiError("Malformed request body"), response.getBody());
    }

    @Test
    @DisplayName("Conteúdo inválido responde 400 com a mensagem")
    void givenBadRequestException_whenHandle_thenRespondsWith400() {
        // Arrange
        final BadRequestException exception = new BadRequestException("Photo must be a JPEG");

        // Act
        final ResponseEntity<ApiError> response = this.handler.handleBadRequest(exception);

        // Assert
        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Assertions.assertEquals(new ApiError("Photo must be a JPEG"), response.getBody());
    }
}
