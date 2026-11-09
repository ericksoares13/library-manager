package br.ufmg.librarymanager.dto;

import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.model.Loan;
import br.ufmg.librarymanager.model.Member;
import java.time.LocalDate;

/**
 * Empréstimo com o título e o ISBN (capa) do livro e o nome e a versão da foto do membro. Livro ou
 * membro excluídos depois da devolução chegam como `null`: os dados deles ficam `null`.
 */
public record LoanResponse(
        String id,
        String bookId,
        String bookTitle,
        String bookIsbn,
        String memberId,
        String memberName,
        Integer memberPhotoVersion,
        LocalDate loanDate,
        LocalDate dueDate,
        LocalDate returnDate,
        boolean overdue) {

    public static LoanResponse from(
            final Loan loan, final Book book, final Member member, final LocalDate today) {
        return new LoanResponse(
                loan.getId(),
                loan.getBookId(),
                book == null ? null : book.getTitle(),
                book == null ? null : book.getIsbn(),
                loan.getMemberId(),
                member == null ? null : member.getName(),
                member == null ? null : member.getPhotoVersion(),
                loan.getLoanDate(),
                loan.getDueDate(),
                loan.getReturnDate(),
                loan.isOverdue(today));
    }
}
