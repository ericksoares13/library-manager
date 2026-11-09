import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { membersApi, photoUrl, type Member } from "../api/members";
import { Field } from "../components/Field";
import {
  CloseIcon,
  DeleteIcon,
  PersonIcon,
  PhotoCameraIcon,
  PhotoLibraryIcon,
} from "../components/icons";
import { Modal } from "../components/Modal";
import { CameraCapture } from "./CameraCapture";
import { PhotoCropper } from "./PhotoCropper";
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

/** O que fazer com a foto ao salvar: manter a atual, enviar uma nova ou remover. */
type PhotoChange = { kind: "keep" } | { kind: "new"; photo: Blob } | { kind: "remove" };

/** Etapa do painel: o formulário, a câmera ou o ajuste da imagem escolhida ou tirada. */
type Step = "form" | "camera" | "crop";

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

/** Dá para tirar foto pelo navegador? (sem `mediaDevices` fora de HTTPS e em navegadores antigos) */
const canUseCamera = () => Boolean(navigator.mediaDevices?.getUserMedia);

/** Endereço local de um arquivo ou foto, liberado quando ele sai da tela. */
function useObjectUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(
    () => () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    },
    [url],
  );
  return url;
}

/**
 * Cadastro e edição do membro, com a foto: tirar pela câmera ou escolher um arquivo leva ao ajuste
 * (recorte 2:3) no mesmo painel; a foto só é enviada ao salvar.
 */
export function MemberFormSheet({ member, onClose, onSaved }: Props) {
  const titleId = useId();
  const [form, setForm] = useState<MemberForm>(member ? toMemberForm(member) : emptyMemberForm);
  // Campos que a pessoa editou e campos que ela editou e já deixou (esses mostram o erro)
  const [edited, setEdited] = useState<Partial<Record<keyof MemberForm, boolean>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof MemberForm, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<ServerError | null>(null);
  // Depois de cadastrar, se a foto falhar, salvar de novo atualiza o mesmo membro
  const [saved, setSaved] = useState<Member | undefined>(member);
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" });
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("form");
  // Imagem escolhida ou tirada, ainda sem recorte
  const [source, setSource] = useState<Blob | null>(null);
  const sourceUrl = useObjectUrl(source);
  const newPhotoUrl = useObjectUrl(photo.kind === "new" ? photo.photo : null);
  const fileRef = useRef<HTMLInputElement>(null);

  const errors: MemberFormErrors = validateMember(form);
  const currentPhoto =
    photo.kind === "new"
      ? newPhotoUrl
      : photo.kind === "remove" || !member
        ? null
        : photoUrl(member);

  // Valida campo a campo depois que a pessoa edita e sai dele (não a cada tecla do primeiro
  // preenchimento, nem no campo que ela só atravessou ou deixou ao clicar fora dele)
  const errorOf = (field: keyof MemberForm) =>
    (touched[field] || submitted ? errors[field] : undefined) ??
    (serverError?.field === field ? serverError.message : undefined);

  const bind = (field: keyof MemberForm) => ({
    value: form[field],
    error: errorOf(field),
    onChange: (event: { target: { value: string } }) => {
      setForm({ ...form, [field]: event.target.value });
      setEdited({ ...edited, [field]: true });
      if (serverError?.field === field) {
        setServerError(null);
      }
    },
    onBlur: () => {
      if (edited[field]) {
        setTouched({ ...touched, [field]: true });
      }
    },
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
    let result: Member;
    try {
      result = saved ? await membersApi.update(saved.id, input) : await membersApi.create(input);
      setSaved(result);
    } catch (error) {
      setServerError(toServerError(error));
      setSaving(false);
      return;
    }
    try {
      if (photo.kind === "new") {
        result = await membersApi.changePhoto(result.id, photo.photo);
      } else if (photo.kind === "remove" && result.photoVersion !== null) {
        result = await membersApi.removePhoto(result.id);
      }
      onSaved(result);
    } catch {
      setServerError({
        message: "O membro foi salvo, mas não foi possível salvar a foto. Tente novamente.",
      });
      setSaving(false);
    }
  }

  function startCrop(image: Blob) {
    setPhotoError(null);
    setSource(image);
    setStep("crop");
  }

  function backToForm() {
    setSource(null);
    setStep("form");
  }

  const titles: Record<Step, string> = {
    form: member ? "Editar membro" : "Novo membro",
    camera: "Tirar foto",
    crop: "Ajustar foto",
  };
  const header = (
    <header className="sheet-header">
      <h2 id={titleId}>{titles[step]}</h2>
      <button
        type="button"
        className="icon-button"
        aria-label="Fechar"
        onClick={step === "form" ? onClose : backToForm}
      >
        <CloseIcon className="icon" aria-hidden />
      </button>
    </header>
  );

  // Na câmera e no ajuste, fechar (Esc, fundo, ×) volta ao formulário sem perder o preenchido
  if (step === "camera") {
    return (
      <Modal titleId={titleId} onClose={backToForm}>
        {header}
        <CameraCapture onCapture={startCrop} onCancel={backToForm} />
      </Modal>
    );
  }
  if (step === "crop") {
    return (
      <Modal titleId={titleId} onClose={backToForm}>
        {header}
        {sourceUrl && (
          <PhotoCropper
            src={sourceUrl}
            onConfirm={(cropped) => {
              setPhoto({ kind: "new", photo: cropped });
              backToForm();
            }}
            onCancel={backToForm}
            onError={() => {
              backToForm();
              setPhotoError("Não foi possível abrir esta imagem. Escolha outra.");
            }}
          />
        )}
      </Modal>
    );
  }

  return (
    <Modal titleId={titleId} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {header}

        <div className="photo-field">
          {currentPhoto ? (
            <span className="cover cover-large">
              <img src={currentPhoto} alt="Foto do membro" />
            </span>
          ) : (
            <span className="cover cover-large cover-placeholder" aria-hidden>
              <PersonIcon className="cover-icon" />
            </span>
          )}
          <div className="photo-field-actions">
            {canUseCamera() && (
              <button type="button" className="button" onClick={() => setStep("camera")}>
                <PhotoCameraIcon className="icon" aria-hidden />
                Tirar foto
              </button>
            )}
            <button type="button" className="button" onClick={() => fileRef.current?.click()}>
              <PhotoLibraryIcon className="icon" aria-hidden />
              Escolher foto
            </button>
            {/* Sem foto fica no lugar, apagado: o formulário não muda de altura */}
            <button
              type="button"
              className="button danger-text"
              disabled={!currentPhoto}
              onClick={() => setPhoto({ kind: "remove" })}
            >
              <DeleteIcon className="icon" aria-hidden />
              Remover foto
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label="Arquivo da foto"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Limpa para dar para escolher o mesmo arquivo de novo depois de cancelar
                event.target.value = "";
                if (file) {
                  startCrop(file);
                }
              }}
            />
          </div>
        </div>
        {photoError && (
          <p role="alert" className="form-error">
            {photoError}
          </p>
        )}

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
