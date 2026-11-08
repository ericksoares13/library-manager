package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.model.Loan;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

public class LoanRepositoryCustomImpl implements LoanRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public LoanRepositoryCustomImpl(final MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<Loan> search(final LoanFilter filter, final Pageable pageable) {
        final Query query = Query.query(filter.toCriteria());
        final List<Loan> loans =
                this.mongoTemplate.find(Query.of(query).with(pageable), Loan.class);
        return PageableExecutionUtils.getPage(
                loans, pageable, () -> this.mongoTemplate.count(query, Loan.class));
    }
}
