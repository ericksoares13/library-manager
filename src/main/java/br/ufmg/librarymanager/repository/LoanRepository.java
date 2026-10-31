package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.model.Loan;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LoanRepository extends MongoRepository<Loan, String> {

    List<Loan> findByMemberId(String memberId);

    long countByMemberIdAndReturnDateIsNull(String memberId);

    boolean existsByBookIdAndMemberIdAndReturnDateIsNull(String bookId, String memberId);

    boolean existsByBookIdAndReturnDateIsNull(String bookId);

    boolean existsByMemberIdAndReturnDateIsNull(String memberId);
}
