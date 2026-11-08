package br.ufmg.librarymanager.dto;

import java.time.LocalDate;
import java.util.function.Function;
import org.springframework.data.mongodb.core.query.Criteria;

/** Filtro de situação da listagem de empréstimos (parâmetro `status`). */
public enum LoanStatus {
    /** Não devolvidos, atrasados ou não. */
    ACTIVE(today -> Criteria.where("returnDate").is(null)),
    OVERDUE(today -> Criteria.where("returnDate").is(null).and("dueDate").lt(today)),
    RETURNED(today -> Criteria.where("returnDate").ne(null)),
    ALL(today -> new Criteria());

    private final Function<LocalDate, Criteria> criteria;

    LoanStatus(final Function<LocalDate, Criteria> criteria) {
        this.criteria = criteria;
    }

    public Criteria toCriteria(final LocalDate today) {
        return this.criteria.apply(today);
    }
}
