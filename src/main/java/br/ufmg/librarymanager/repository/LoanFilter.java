package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.dto.LoanStatus;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.mongodb.core.query.Criteria;

/**
 * Filtro da listagem de empréstimos: a situação, o membro ou o livro (na página dele) e, se houver
 * busca, os livros e membros que casam com ela (o empréstimo entra se for de um deles). Fora das
 * páginas de detalhe, `memberId` e `bookId` são `null`; sem busca, `bookIds` e `memberIds` são
 * `null`.
 */
public record LoanFilter(
        LoanStatus status,
        LocalDate today,
        String memberId,
        String bookId,
        List<String> bookIds,
        List<String> memberIds) {

    public static LoanFilter of(final LoanStatus status, final LocalDate today) {
        return new LoanFilter(status, today, null, null, null, null);
    }

    public LoanFilter forMember(final String memberId) {
        return new LoanFilter(
                this.status, this.today, memberId, this.bookId, this.bookIds, this.memberIds);
    }

    public LoanFilter forBook(final String bookId) {
        return new LoanFilter(
                this.status, this.today, this.memberId, bookId, this.bookIds, this.memberIds);
    }

    public LoanFilter matching(final List<String> bookIds, final List<String> memberIds) {
        return new LoanFilter(
                this.status, this.today, this.memberId, this.bookId, bookIds, memberIds);
    }

    public Criteria toCriteria() {
        final List<Criteria> parts = new ArrayList<>();
        parts.add(this.status.toCriteria(this.today));
        if (this.memberId != null) {
            parts.add(Criteria.where("memberId").is(this.memberId));
        }
        if (this.bookId != null) {
            parts.add(Criteria.where("bookId").is(this.bookId));
        }
        if (this.bookIds != null) {
            parts.add(
                    new Criteria()
                            .orOperator(
                                    Criteria.where("bookId").in(this.bookIds),
                                    Criteria.where("memberId").in(this.memberIds)));
        }
        return parts.size() == 1 ? parts.getFirst() : new Criteria().andOperator(parts);
    }
}
