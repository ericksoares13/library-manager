package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.dto.LoanStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.mongodb.core.query.Criteria;

/**
 * Filtro da listagem de empréstimos: a situação e, se houver busca, os livros e membros que casam
 * com ela (o empréstimo entra se for de um deles). Sem busca, `bookIds` e `memberIds` são `null`.
 */
public record LoanFilter(
        LoanStatus status, LocalDate today, List<String> bookIds, List<String> memberIds) {

    public static LoanFilter of(final LoanStatus status, final LocalDate today) {
        return new LoanFilter(status, today, null, null);
    }

    public LoanFilter matching(final List<String> bookIds, final List<String> memberIds) {
        return new LoanFilter(this.status, this.today, bookIds, memberIds);
    }

    public Criteria toCriteria() {
        final Criteria byStatus = this.status.toCriteria(this.today);
        if (this.bookIds == null) {
            return byStatus;
        }
        return new Criteria()
                .andOperator(
                        byStatus,
                        new Criteria()
                                .orOperator(
                                        Criteria.where("bookId").in(this.bookIds),
                                        Criteria.where("memberId").in(this.memberIds)));
    }
}
