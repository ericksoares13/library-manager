import type { Member, MemberInput } from "../api/members";

/** Valores do formulário como digitados. */
export type MemberForm = {
  name: string;
  email: string;
};

export type MemberFormErrors = Partial<Record<keyof MemberForm, string>>;

export const emptyMemberForm: MemberForm = { name: "", email: "" };

export function toMemberForm(member: Member): MemberForm {
  return { name: member.name, email: member.email };
}

export function toMemberInput(form: MemberForm): MemberInput {
  return { name: form.name.trim(), email: form.email.trim() };
}

// Mesma régua do @Email do back: algo antes e depois de um único "@", sem espaços
const EMAIL = /^[^\s@]+@[^\s@]+$/;

/** Mesmas regras do back (`MemberRequest`), para avisar antes de enviar. */
export function validateMember(form: MemberForm): MemberFormErrors {
  const errors: MemberFormErrors = {};
  if (!form.name.trim()) {
    errors.name = "Informe o nome.";
  }
  if (!form.email.trim()) {
    errors.email = "Informe o e-mail.";
  } else if (!EMAIL.test(form.email.trim())) {
    errors.email = "Informe um e-mail válido.";
  }
  return errors;
}
