package br.ufmg.librarymanager.dto;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Dígito verificador do ISBN. ISBN-13: soma dos dígitos com pesos 1 e 3 alternados, múltipla de 10.
 * ISBN-10: soma com pesos de 10 a 1 (o último pode ser "X", que vale 10), múltipla de 11.
 */
public class IsbnValidator implements ConstraintValidator<ValidIsbn, String> {

    private static final String ISBN_10 = "\\d{9}[\\dX]";

    private static final String ISBN_13 = "\\d{13}";

    @Override
    public boolean isValid(final String isbn, final ConstraintValidatorContext context) {
        if (isbn == null || !isbn.matches(ISBN_10 + "|" + ISBN_13)) {
            return true;
        }
        return isbn.length() == 13 ? isValidIsbn13(isbn) : isValidIsbn10(isbn);
    }

    private static boolean isValidIsbn13(final String isbn) {
        int sum = 0;
        for (int i = 0; i < isbn.length(); i++) {
            sum += Character.getNumericValue(isbn.charAt(i)) * (i % 2 == 0 ? 1 : 3);
        }
        return sum % 10 == 0;
    }

    private static boolean isValidIsbn10(final String isbn) {
        int sum = 0;
        for (int i = 0; i < isbn.length(); i++) {
            final char digit = isbn.charAt(i);
            sum += (digit == 'X' ? 10 : Character.getNumericValue(digit)) * (10 - i);
        }
        return sum % 11 == 0;
    }
}
