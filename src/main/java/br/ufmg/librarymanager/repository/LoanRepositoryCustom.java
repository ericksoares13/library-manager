package br.ufmg.librarymanager.repository;

import br.ufmg.librarymanager.model.Loan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Consulta da listagem, que combina situação e busca (não cabe num método derivado). */
public interface LoanRepositoryCustom {

    Page<Loan> search(LoanFilter filter, Pageable pageable);
}
