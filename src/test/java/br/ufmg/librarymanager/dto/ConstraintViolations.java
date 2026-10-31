package br.ufmg.librarymanager.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import java.util.stream.Collectors;

/** Valida um objeto com o Bean Validation e devolve as violações no formato "campo: mensagem". */
final class ConstraintViolations {

    private static final Validator VALIDATOR =
            Validation.buildDefaultValidatorFactory().getValidator();

    private ConstraintViolations() {}

    static Set<String> of(final Object request) {
        return VALIDATOR.validate(request).stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .collect(Collectors.toSet());
    }
}
