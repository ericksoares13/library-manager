package br.ufmg.librarymanager.dto;

import br.ufmg.librarymanager.model.Member;

/**
 * Membro na API. `photoVersion` é `null` sem foto; muda a cada foto nova, para o endereço da imagem
 * (`/api/members/{id}/photo?v=...`) mudar junto e o navegador não mostrar a antiga do cache.
 */
public record MemberResponse(String id, String name, String email, Integer photoVersion) {

    public static MemberResponse from(final Member member) {
        return new MemberResponse(
                member.getId(), member.getName(), member.getEmail(), member.getPhotoVersion());
    }
}
