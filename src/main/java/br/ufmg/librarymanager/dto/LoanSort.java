package br.ufmg.librarymanager.dto;

import org.springframework.data.domain.Sort;

/** Ordenações da listagem de empréstimos (parâmetro `sort`). O id desempata: páginas estáveis. */
public enum LoanSort {
    /** Vencimento mais próximo primeiro (os atrasados aparecem antes). */
    DUE_DATE(Sort.by("dueDate")),
    RECENT(Sort.by(Sort.Direction.DESC, "loanDate", "id"));

    private final Sort sort;

    LoanSort(final Sort sort) {
        // Sem repetir o id: no Mongo a segunda ordem do mesmo campo sobrescreveria a primeira
        this.sort = sort.getOrderFor("id") == null ? sort.and(Sort.by("id")) : sort;
    }

    public Sort toSort() {
        return this.sort;
    }
}
