package br.ufmg.librarymanager.dto;

import jakarta.validation.constraints.NotBlank;

public record BorrowRequest(
        @NotBlank(message = "bookId is required") String bookId,
        @NotBlank(message = "memberId is required") String memberId) {}
