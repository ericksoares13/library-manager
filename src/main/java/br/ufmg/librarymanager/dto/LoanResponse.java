package br.ufmg.librarymanager.dto;

import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.model.Loan;
import br.ufmg.librarymanager.model.Member;
import java.time.LocalDate;

/**
 * Empréstimo com o título do livro e o nome do membro. Livro ou membro excluídos depois da
 * devolução chegam como `null`: o título e o nome ficam `null`.
 */
public record LoanResponse(
        String id,
        String bookId,
        String bookTitle,
        String memberId,
        String memberName,
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
                loan.getMemberId(),
                member == null ? null : member.getName(),
                loan.getLoanDate(),
                loan.getDueDate(),
                loan.getReturnDate(),
                loan.isOverdue(today));
    }
}
