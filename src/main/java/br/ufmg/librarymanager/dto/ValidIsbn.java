package br.ufmg.librarymanager.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * ISBN com o dígito verificador certo. Só confere o dígito quando o formato já está certo (10 ou 13
 * caracteres): o formato é do `@Pattern`, e cada erro aparece uma vez só.
 */
@Target({ElementType.FIELD, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = IsbnValidator.class)
public @interface ValidIsbn {

    String message() default "isbn has an invalid check digit";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
