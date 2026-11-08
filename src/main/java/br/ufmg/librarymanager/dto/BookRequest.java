package br.ufmg.librarymanager.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BookRequest(
        @NotBlank(message = "title is required") String title,
        @NotBlank(message = "author is required") String author,
        @NotBlank(message = "isbn is required")
                @Pattern(
                        regexp = "\\d{9}[\\dX]|\\d{13}",
                        message = "isbn must have 10 or 13 digits")
                @ValidIsbn
                String isbn,
        @Min(value = 1, message = "totalCopies must be at least 1") int totalCopies) {}
