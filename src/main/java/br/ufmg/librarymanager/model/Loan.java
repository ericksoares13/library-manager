package br.ufmg.librarymanager.model;

import br.ufmg.librarymanager.exception.BusinessException;
import java.time.LocalDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "loans")
public class Loan {

    public static final int LOAN_PERIOD_DAYS = 14;

    @Id private String id;

    private String bookId;

    private String memberId;

    private LocalDate loanDate;

    private LocalDate dueDate;

    private LocalDate returnDate;

    protected Loan() {}

    public Loan(final String bookId, final String memberId, final LocalDate loanDate) {
        this.bookId = bookId;
        this.memberId = memberId;
        this.loanDate = loanDate;
        this.dueDate = loanDate.plusDays(LOAN_PERIOD_DAYS);
    }

    public void markReturned(final LocalDate returnDate) {
        if (this.isReturned()) {
            throw new BusinessException("Loan has already been returned");
        }
        if (returnDate.isBefore(this.loanDate)) {
            throw new BusinessException("returnDate cannot be before loanDate");
        }
        this.returnDate = returnDate;
    }

    public boolean isReturned() {
        return this.returnDate != null;
    }

    public boolean isOverdue(final LocalDate today) {
        return !this.isReturned() && today.isAfter(this.dueDate);
    }

    public String getId() {
        return this.id;
    }

    public String getBookId() {
        return this.bookId;
    }

    public String getMemberId() {
        return this.memberId;
    }

    public LocalDate getLoanDate() {
        return this.loanDate;
    }

    public LocalDate getDueDate() {
        return this.dueDate;
    }

    public LocalDate getReturnDate() {
        return this.returnDate;
    }
}
