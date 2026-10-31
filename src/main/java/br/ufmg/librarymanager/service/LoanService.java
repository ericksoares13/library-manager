package br.ufmg.librarymanager.service;

import br.ufmg.librarymanager.dto.BorrowRequest;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.model.Loan;
import br.ufmg.librarymanager.model.Member;
import br.ufmg.librarymanager.repository.BookRepository;
import br.ufmg.librarymanager.repository.LoanRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class LoanService {

    private final LoanRepository loanRepository;

    private final BookRepository bookRepository;

    private final BookService bookService;

    private final MemberService memberService;

    private final Clock clock;

    public LoanService(
            final LoanRepository loanRepository,
            final BookRepository bookRepository,
            final BookService bookService,
            final MemberService memberService,
            final Clock clock) {
        this.loanRepository = loanRepository;
        this.bookRepository = bookRepository;
        this.bookService = bookService;
        this.memberService = memberService;
        this.clock = clock;
    }

    public List<Loan> findAll() {
        return this.loanRepository.findAll();
    }

    public List<Loan> findByMember(final String memberId) {
        this.memberService.findById(memberId);
        return this.loanRepository.findByMemberId(memberId);
    }

    public Loan borrow(final BorrowRequest request) {
        final Book book = this.bookService.findById(request.bookId());
        final Member member = this.memberService.findById(request.memberId());

        if (this.loanRepository.existsByBookIdAndMemberIdAndReturnDateIsNull(
                request.bookId(), request.memberId())) {
            throw new BusinessException("Member already has an active loan for this book");
        }
        if (this.loanRepository.countByMemberIdAndReturnDateIsNull(request.memberId())
                >= Member.MAX_ACTIVE_LOANS) {
            throw new BusinessException(
                    member.getName()
                            + " has reached the limit of "
                            + Member.MAX_ACTIVE_LOANS
                            + " active loans");
        }

        book.borrowCopy();
        this.bookRepository.save(book);
        return this.loanRepository.save(
                new Loan(request.bookId(), request.memberId(), this.today()));
    }

    public Loan returnLoan(final String loanId) {
        final Loan loan =
                this.loanRepository
                        .findById(loanId)
                        .orElseThrow(() -> new NotFoundException("Loan not found: " + loanId));
        loan.markReturned(this.today());

        final Book book = this.bookService.findById(loan.getBookId());
        book.returnCopy();
        this.bookRepository.save(book);
        return this.loanRepository.save(loan);
    }

    private LocalDate today() {
        return LocalDate.now(this.clock);
    }
}
