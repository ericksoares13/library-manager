package br.ufmg.librarymanager.service;

import br.ufmg.librarymanager.dto.MemberRequest;
import br.ufmg.librarymanager.dto.MemberSort;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Member;
import br.ufmg.librarymanager.model.SearchKey;
import br.ufmg.librarymanager.repository.LoanRepository;
import br.ufmg.librarymanager.repository.MemberRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class MemberService {

    private final MemberRepository memberRepository;

    private final LoanRepository loanRepository;

    public MemberService(
            final MemberRepository memberRepository, final LoanRepository loanRepository) {
        this.memberRepository = memberRepository;
        this.loanRepository = loanRepository;
    }

    /**
     * Página da listagem. A busca (`query`) ignora maiúsculas e acentos no nome e maiúsculas no
     * e-mail; em branco, lista todos.
     */
    public Page<Member> search(
            final String query, final MemberSort sort, final int page, final int size) {
        final Pageable pageable = Pages.of(page, size, sort.toSort());
        final String key = SearchKey.of(query);
        if (key.isEmpty()) {
            return this.memberRepository.findAll(pageable);
        }
        return this.memberRepository.findByNameKeyContainingOrEmailContainingIgnoreCase(
                key, key, pageable);
    }

    public Member findById(final String id) {
        return this.memberRepository
                .findById(id)
                .orElseThrow(() -> new NotFoundException("Member not found: " + id));
    }

    public Member create(final MemberRequest request) {
        this.requireEmailNotInUse(request.email());
        return this.memberRepository.save(new Member(request.name(), request.email()));
    }

    public Member update(final String id, final MemberRequest request) {
        final Member member = this.findById(id);
        if (!member.getEmail().equals(request.email())) {
            this.requireEmailNotInUse(request.email());
        }
        member.updateDetails(request.name(), request.email());
        return this.memberRepository.save(member);
    }

    public void delete(final String id) {
        final Member member = this.findById(id);
        if (this.loanRepository.existsByMemberIdAndReturnDateIsNull(id)) {
            throw new BusinessException("A member with active loans cannot be deleted");
        }
        this.memberRepository.delete(member);
    }

    private void requireEmailNotInUse(final String email) {
        if (this.memberRepository.existsByEmail(email)) {
            throw new BusinessException("A member with email " + email + " already exists");
        }
    }
}
