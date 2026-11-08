package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.model.Loan;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LoanRepository extends MongoRepository<Loan, String>, LoanRepositoryCustom {

    long countByMemberIdAndReturnDateIsNull(String memberId);

    boolean existsByBookIdAndMemberIdAndReturnDateIsNull(String bookId, String memberId);

    boolean existsByBookIdAndReturnDateIsNull(String bookId);

    boolean existsByMemberIdAndReturnDateIsNull(String memberId);
}
