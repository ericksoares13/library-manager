package br.ufmg.librarymanager.service;

import br.ufmg.librarymanager.dto.BorrowRequest;
import br.ufmg.librarymanager.dto.LoanResponse;
import br.ufmg.librarymanager.dto.LoanSort;
import br.ufmg.librarymanager.dto.LoanStatus;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Book;
import br.ufmg.librarymanager.model.Loan;
import br.ufmg.librarymanager.model.Member;
import br.ufmg.librarymanager.model.SearchKey;
import br.ufmg.librarymanager.repository.BookRepository;
import br.ufmg.librarymanager.repository.IdOnly;
import br.ufmg.librarymanager.repository.LoanFilter;
import br.ufmg.librarymanager.repository.LoanRepository;
import br.ufmg.librarymanager.repository.MemberRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

@Service
public class LoanService {

    private final LoanRepository loanRepository;

    private final BookRepository bookRepository;

    private final MemberRepository memberRepository;

    private final BookService bookService;

    private final MemberService memberService;

    private final Clock clock;

    public LoanService(
            final LoanRepository loanRepository,
            final BookRepository bookRepository,
            final MemberRepository memberRepository,
            final BookService bookService,
            final MemberService memberService,
            final Clock clock) {
        this.loanRepository = loanRepository;
        this.bookRepository = bookRepository;
        this.memberRepository = memberRepository;
        this.bookService = bookService;
        this.memberService = memberService;
        this.clock = clock;
    }

    /**
     * Página da listagem. A busca (`query`) acha os livros (título, autor, ISBN) e os membros
     * (nome, e-mail) como nas outras listagens e traz os empréstimos deles; em branco, lista todos.
     */
    public Page<LoanResponse> search(
            final String query,
            final LoanStatus status,
            final LoanSort sort,
            final int page,
            final int size) {
        final LocalDate today = this.today();
        final String key = SearchKey.of(query);
        final LoanFilter filter =
                key.isEmpty()
                        ? LoanFilter.of(status, today)
                        : LoanFilter.of(status, today)
                                .matching(this.bookIdsMatching(key), this.memberIdsMatching(key));
        final Page<Loan> loans =
                this.loanRepository.search(filter, Pages.of(page, size, sort.toSort()));

        // Livros e membros da página numa consulta cada, em vez de uma por empréstimo
        final Map<String, Book> books =
                byId(
                        this.bookRepository.findAllById(loans.map(Loan::getBookId).toSet()),
                        Book::getId);
        final Map<String, Member> members =
                byId(
                        this.memberRepository.findAllById(loans.map(Loan::getMemberId).toSet()),
                        Member::getId);
        return loans.map(
                loan ->
                        LoanResponse.from(
                                loan,
                                books.get(loan.getBookId()),
                                members.get(loan.getMemberId()),
                                today));
    }

    public LoanResponse borrow(final BorrowRequest request) {
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
        final LocalDate today = this.today();
        final Loan loan =
                this.loanRepository.save(new Loan(request.bookId(), request.memberId(), today));
        return LoanResponse.from(loan, book, member, today);
    }

    public LoanResponse returnLoan(final String loanId) {
        final Loan loan =
                this.loanRepository
                        .findById(loanId)
                        .orElseThrow(() -> new NotFoundException("Loan not found: " + loanId));
        final LocalDate today = this.today();
        loan.markReturned(today);

        final Book book = this.bookService.findById(loan.getBookId());
        book.returnCopy();
        this.bookRepository.save(book);
        // Membro com empréstimo ativo não pode ser excluído: ainda existe
        final Member member = this.memberService.findById(loan.getMemberId());
        return LoanResponse.from(this.loanRepository.save(loan), book, member, today);
    }

    private LocalDate today() {
        return LocalDate.now(this.clock);
    }

    private List<String> bookIdsMatching(final String key) {
        return ids(
                this.bookRepository
                        .findIdsByTitleKeyContainingOrAuthorKeyContainingOrIsbnContaining(
                                key, key, key));
    }

    private List<String> memberIdsMatching(final String key) {
        return ids(
                this.memberRepository.findIdsByNameKeyContainingOrEmailContainingIgnoreCase(
                        key, key));
    }

    private static List<String> ids(final List<IdOnly> documents) {
        return documents.stream().map(IdOnly::getId).toList();
    }

    private static <T> Map<String, T> byId(final List<T> entities, final Function<T, String> idOf) {
        return entities.stream().collect(Collectors.toMap(idOf, Function.identity()));
    }
}
