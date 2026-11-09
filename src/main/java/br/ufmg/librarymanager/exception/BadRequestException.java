package br.ufmg.librarymanager.exception;

/** Requisição com conteúdo inválido que a Bean Validation não cobre (ex.: a foto do membro). */
public class BadRequestException extends RuntimeException {

    public BadRequestException(final String message) {
        super(message);
    }
}
