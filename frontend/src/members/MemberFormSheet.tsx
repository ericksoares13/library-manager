import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { membersApi, type Member } from "../api/members";
import { Field } from "../components/Field";
import { CloseIcon } from "../components/icons";
import { Modal } from "../components/Modal";
import {
  emptyMemberForm,
  toMemberForm,
  toMemberInput,
  validateMember,
  type MemberForm,
  type MemberFormErrors,
} from "./validation";

type Props = {
  /** Membro em edição; sem ele, o formulário cadastra um novo. */
  member?: Member;
  onClose: () => void;
  onSaved: (member: Member) => void;
};

type ServerError = { field?: keyof MemberForm; message: string };

function toServerError(error: unknown): ServerError {
  // O único 409 possível (cadastro ou edição) é o e-mail já usado por outro membro
  if (error instanceof ApiError && error.status === 409) {
    return { field: "email", message: "Já existe um membro com este e-mail." };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { message: "Este membro não existe mais." };
  }
  return { message: "Não foi possível salvar o membro. Tente novamente." };
}

export function MemberFormSheet({ member, onClose, onSaved }: Props) {
  const titleId = useId();
  const [form, setForm] = useState<MemberForm>(member ? toMemberForm(member) : emptyMemberForm);
  const [touched, setTouched] = useState<Partial<Record<keyof MemberForm, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const errors: MemberFormErrors = validateMember(form);

  // Valida campo a campo depois que a pessoa sai dele (não a cada tecla do primeiro preenchimento)
  const errorOf = (field: keyof MemberForm) =>
    (touched[field] || submitted ? errors[field] : undefined) ??
    (serverError?.field === field ? serverError.message : undefined);

  const bind = (field: keyof MemberForm) => ({
    value: form[field],
    error: errorOf(field),
    onChange: (event: { target: { value: string } }) => {
      setForm({ ...form, [field]: event.target.value });
      if (serverError?.field === field) {
        setServerError(null);
      }
    },
    onBlur: () => setTouched({ ...touched, [field]: true }),
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setSaving(true);
    setServerError(null);
    const input = toMemberInput(form);
    try {
      onSaved(member ? await membersApi.update(member.id, input) : await membersApi.create(input));
    } catch (error) {
      setServerError(toServerError(error));
      setSaving(false);
    }
  }

  return (
    <Modal titleId={titleId} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <header className="sheet-header">
          <h2 id={titleId}>{member ? "Editar membro" : "Novo membro"}</h2>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>
            <CloseIcon className="icon" aria-hidden />
          </button>
        </header>

        <Field label="Nome" autoComplete="off" autoFocus {...bind("name")} />
        <Field label="E-mail" type="email" autoComplete="off" {...bind("email")} />

        {serverError && !serverError.field && (
          <p role="alert" className="form-error">
            {serverError.message}
          </p>
        )}

        <footer className="sheet-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
