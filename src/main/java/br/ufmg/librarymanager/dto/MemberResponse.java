package br.ufmg.librarymanager.dto;

import br.ufmg.librarymanager.model.Member;

public record MemberResponse(String id, String name, String email) {

    public static MemberResponse from(final Member member) {
        return new MemberResponse(member.getId(), member.getName(), member.getEmail());
    }
}
