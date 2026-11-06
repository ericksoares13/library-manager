package br.ufmg.librarymanager.dto;

import org.springframework.data.domain.Sort;

/** Ordenações da listagem de membros (parâmetro `sort`). O id desempata: páginas estáveis. */
public enum MemberSort {
    NAME(Sort.by("nameKey")),
    EMAIL(Sort.by("email")),
    RECENT(Sort.by(Sort.Direction.DESC, "id"));

    private final Sort sort;

    MemberSort(final Sort sort) {
        // Sem repetir o id: no Mongo a segunda ordem do mesmo campo sobrescreveria a primeira
        this.sort = sort.getOrderFor("id") == null ? sort.and(Sort.by("id")) : sort;
    }

    public Sort toSort() {
        return this.sort;
    }
}
