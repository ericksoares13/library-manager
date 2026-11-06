package br.ufmg.librarymanager.dto;

import org.springframework.data.domain.Sort;

/** Ordenações da listagem de livros (parâmetro `sort`). O id desempata: páginas estáveis. */
public enum BookSort {
    TITLE(Sort.by("titleKey")),
    AUTHOR(Sort.by("authorKey", "titleKey")),
    RECENT(Sort.by(Sort.Direction.DESC, "id")),
    AVAILABILITY(Sort.by(Sort.Direction.DESC, "availableCopies").and(Sort.by("titleKey")));

    private final Sort sort;

    BookSort(final Sort sort) {
        // Sem repetir o id: no Mongo a segunda ordem do mesmo campo sobrescreveria a primeira
        this.sort = sort.getOrderFor("id") == null ? sort.and(Sort.by("id")) : sort;
    }

    public Sort toSort() {
        return this.sort;
    }
}
