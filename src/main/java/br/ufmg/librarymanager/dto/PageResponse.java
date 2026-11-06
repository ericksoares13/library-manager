package br.ufmg.librarymanager.dto;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/** Uma página da listagem, no formato da API (o JSON do `Page` do Spring não é estável). */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    public static <E, T> PageResponse<T> from(final Page<E> page, final Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
