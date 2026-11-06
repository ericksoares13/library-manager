package br.ufmg.librarymanager.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Monta a página pedida, corrigindo valores fora do intervalo em vez de falhar. */
final class Pages {

    static final int MAX_SIZE = 100;

    private Pages() {}

    static Pageable of(final int page, final int size, final Sort sort) {
        return PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_SIZE), sort);
    }
}
