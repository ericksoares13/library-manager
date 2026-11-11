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

// Mesma régua do @Email do back (Hibernate Validator): antes do "@", grupos separados por um ponto
// só (sem ponto nas pontas); depois, partes de até 63 caracteres sem hífen nas pontas. Fora ficam
// só os casos raros que o back aceita: nome entre aspas e IP entre colchetes
const EMAIL_CHAR = "[a-z0-9!#$%&'*+/=?^_`{|}~\\u0080-\\uffff-]";
const DOMAIN_EDGE = "[a-z0-9!#$%&'*+/=?^_`{|}~\\u0080-\\uffff]";
const LOCAL_PART = new RegExp(`^${EMAIL_CHAR}+(\\.${EMAIL_CHAR}+)*$`, "i");
const DOMAIN_LABEL = new RegExp(`^${DOMAIN_EDGE}(${EMAIL_CHAR}{0,61}${DOMAIN_EDGE})?$`, "i");

function isValidEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return (
    at > 0 &&
    local.length <= 64 &&
    domain.length <= 255 &&
    LOCAL_PART.test(local) &&
    domain.split(".").every((label) => DOMAIN_LABEL.test(label))
  );
}

/** Mesmas regras do back (`MemberRequest`), para avisar antes de enviar. */
export function validateMember(form: MemberForm): MemberFormErrors {
  const errors: MemberFormErrors = {};
  if (!form.name.trim()) {
    errors.name = "Informe o nome.";
  }
  if (!form.email.trim()) {
    errors.email = "Informe o e-mail.";
  } else if (!isValidEmail(form.email.trim())) {
    errors.email = "Informe um e-mail válido.";
  }
  return errors;
}
