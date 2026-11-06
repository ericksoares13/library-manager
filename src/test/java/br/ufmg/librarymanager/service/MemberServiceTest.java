package br.ufmg.librarymanager.service;

import br.ufmg.librarymanager.dto.MemberRequest;
import br.ufmg.librarymanager.dto.MemberSort;
import br.ufmg.librarymanager.exception.BusinessException;
import br.ufmg.librarymanager.exception.NotFoundException;
import br.ufmg.librarymanager.model.Member;
import br.ufmg.librarymanager.repository.LoanRepository;
import br.ufmg.librarymanager.repository.MemberRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@DisplayName("Serviço de membros")
@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    private static final String EMAIL = "ana@example.com";

    @Mock private MemberRepository memberRepository;

    @Mock private LoanRepository loanRepository;

    private MemberService memberService;

    @BeforeEach
    void setUp() {
        this.memberService = new MemberService(this.memberRepository, this.loanRepository);
    }

    private void saveReturnsArgument() {
        Mockito.when(this.memberRepository.save(ArgumentMatchers.any(Member.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void memberExists() {
        Mockito.when(this.memberRepository.findById("m1"))
                .thenReturn(Optional.of(new Member("Ana", EMAIL)));
    }

    @Test
    @DisplayName("Busca membro pelo id")
    void givenExistingId_whenFindById_thenReturnsTheMember() {
        // Arrange
        final Member member = new Member("Ana", EMAIL);
        Mockito.when(this.memberRepository.findById("m1")).thenReturn(Optional.of(member));

        // Act
        final Member result = this.memberService.findById("m1");

        // Assert
        Assertions.assertSame(member, result);
    }

    @Test
    @DisplayName("Busca por id inexistente lança NotFoundException")
    void givenUnknownId_whenFindById_thenThrowsNotFoundException() {
        // Arrange
        Mockito.when(this.memberRepository.findById("missing")).thenReturn(Optional.empty());

        // Act
        final NotFoundException thrown =
                Assertions.assertThrows(
                        NotFoundException.class, () -> this.memberService.findById("missing"));

        // Assert
        Assertions.assertEquals("Member not found: missing", thrown.getMessage());
    }

    @Test
    @DisplayName("Cadastra membro com e-mail novo")
    void givenNewEmail_whenCreate_thenSavesMember() {
        // Arrange
        final MemberRequest request = new MemberRequest("Ana", EMAIL);
        this.saveReturnsArgument();

        // Act
        final Member created = this.memberService.create(request);

        // Assert
        Assertions.assertEquals("Ana", created.getName());
        Assertions.assertEquals(EMAIL, created.getEmail());
    }

    @Test
    @DisplayName("Não cadastra membro com e-mail repetido")
    void givenRegisteredEmail_whenCreate_thenThrowsBusinessExceptionAndDoesNotSave() {
        // Arrange
        final MemberRequest request = new MemberRequest("Outra Ana", EMAIL);
        Mockito.when(this.memberRepository.existsByEmail(EMAIL)).thenReturn(true);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.memberService.create(request));

        // Assert
        Assertions.assertEquals(
                "A member with email " + EMAIL + " already exists", thrown.getMessage());
        Mockito.verify(this.memberRepository, Mockito.never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Mantém o e-mail sem verificar duplicidade de novo")
    void givenSameEmail_whenUpdate_thenUpdatesWithoutCheckingEmailAgain() {
        // Arrange
        final MemberRequest request = new MemberRequest("Ana Souza", EMAIL);
        this.memberExists();
        this.saveReturnsArgument();

        // Act
        final Member updated = this.memberService.update("m1", request);

        // Assert
        Assertions.assertEquals("Ana Souza", updated.getName());
        Mockito.verify(this.memberRepository, Mockito.never())
                .existsByEmail(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Atualiza para um e-mail não usado")
    void givenUnusedEmail_whenUpdate_thenEmailIsUpdated() {
        // Arrange
        final MemberRequest request = new MemberRequest("Ana", "nova@example.com");
        this.memberExists();
        Mockito.when(this.memberRepository.existsByEmail("nova@example.com")).thenReturn(false);
        this.saveReturnsArgument();

        // Act
        final Member updated = this.memberService.update("m1", request);

        // Assert
        Assertions.assertEquals("nova@example.com", updated.getEmail());
    }

    @Test
    @DisplayName("Não permite usar o e-mail de outro membro")
    void givenEmailOfAnotherMember_whenUpdate_thenThrowsBusinessExceptionAndDoesNotSave() {
        // Arrange
        final MemberRequest request = new MemberRequest("Ana", "bia@example.com");
        this.memberExists();
        Mockito.when(this.memberRepository.existsByEmail("bia@example.com")).thenReturn(true);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.memberService.update("m1", request));

        // Assert
        Assertions.assertEquals(
                "A member with email bia@example.com already exists", thrown.getMessage());
        Mockito.verify(this.memberRepository, Mockito.never()).save(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Exclui membro sem empréstimos ativos")
    void givenMemberWithoutActiveLoans_whenDelete_thenMemberIsRemoved() {
        // Arrange
        final Member member = new Member("Ana", EMAIL);
        Mockito.when(this.memberRepository.findById("m1")).thenReturn(Optional.of(member));
        Mockito.when(this.loanRepository.existsByMemberIdAndReturnDateIsNull("m1"))
                .thenReturn(false);

        // Act
        this.memberService.delete("m1");

        // Assert
        Mockito.verify(this.memberRepository).delete(member);
    }

    @Test
    @DisplayName("Não exclui membro com empréstimos ativos")
    void givenMemberWithActiveLoans_whenDelete_thenThrowsBusinessExceptionAndKeepsMember() {
        // Arrange
        this.memberExists();
        Mockito.when(this.loanRepository.existsByMemberIdAndReturnDateIsNull("m1"))
                .thenReturn(true);

        // Act
        final BusinessException thrown =
                Assertions.assertThrows(
                        BusinessException.class, () -> this.memberService.delete("m1"));

        // Assert
        Assertions.assertEquals(
                "A member with active loans cannot be deleted", thrown.getMessage());
        Mockito.verify(this.memberRepository, Mockito.never()).delete(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Busca em branco lista todos os membros na ordem pedida")
    void givenBlankQuery_whenSearch_thenListsAllWithTheSort() {
        // Arrange
        final Page<Member> page = new PageImpl<>(List.of(new Member("Ana", EMAIL)));
        Mockito.when(
                        this.memberRepository.findAll(
                                PageRequest.of(0, 20, MemberSort.RECENT.toSort())))
                .thenReturn(page);

        // Act
        final Page<Member> result = this.memberService.search("", MemberSort.RECENT, 0, 20);

        // Assert
        Assertions.assertSame(page, result);
    }

    @Test
    @DisplayName("Busca no nome e no e-mail sem diferenciar acentos")
    void givenQueryWithAccentsAndCase_whenSearch_thenUsesTheNormalizedKey() {
        // Arrange
        final Pageable pageable = PageRequest.of(0, 20, MemberSort.NAME.toSort());
        final Page<Member> page = new PageImpl<>(List.of(new Member("Érico", EMAIL)));
        Mockito.when(
                        this.memberRepository.findByNameKeyContainingOrEmailContainingIgnoreCase(
                                "erico", "erico", pageable))
                .thenReturn(page);

        // Act
        final Page<Member> result = this.memberService.search("ÉRICO", MemberSort.NAME, 0, 20);

        // Assert
        Assertions.assertSame(page, result);
    }
}
