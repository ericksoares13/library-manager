package br.ufmg.librarymanager.controller;

import br.ufmg.librarymanager.dto.BorrowRequest;
import br.ufmg.librarymanager.dto.LoanResponse;
import br.ufmg.librarymanager.dto.LoanSort;
import br.ufmg.librarymanager.dto.LoanStatus;
import br.ufmg.librarymanager.dto.PageResponse;
import br.ufmg.librarymanager.service.LoanService;
import jakarta.validation.Valid;
import java.util.function.Function;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService loanService;

    public LoanController(final LoanService loanService) {
        this.loanService = loanService;
    }

    @GetMapping
    public PageResponse<LoanResponse> search(
            @RequestParam(defaultValue = "") final String q,
            @RequestParam(defaultValue = "ACTIVE") final LoanStatus status,
            @RequestParam(defaultValue = "DUE_DATE") final LoanSort sort,
            @RequestParam(defaultValue = "0") final int page,
            @RequestParam(defaultValue = "20") final int size,
            @RequestParam(required = false) final String memberId,
            @RequestParam(required = false) final String bookId) {
        return PageResponse.from(
                this.loanService.search(q, status, sort, page, size, memberId, bookId),
                Function.identity());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse borrow(@Valid @RequestBody final BorrowRequest request) {
        return this.loanService.borrow(request);
    }

    @PostMapping("/{id}/return")
    public LoanResponse returnLoan(@PathVariable final String id) {
        return this.loanService.returnLoan(id);
    }
}
