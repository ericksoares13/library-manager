import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { membersApi, type Member, type MemberSort } from "../api/members";
import { CollectionView, type SortOption } from "../components/collection/CollectionView";
import { useCollection } from "../components/collection/useCollection";
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog";
import { DeleteIcon, EditIcon, GroupIcon } from "../components/icons";
import type { PageProps } from "../App";
import { MemberFormSheet } from "./MemberFormSheet";
import { MemberPhoto } from "./MemberPhoto";
import { MemberPage } from "./MemberPage";

type Editing = { member?: Member } | null;

const sortOptions: SortOption<MemberSort>[] = [
  { value: "NAME", label: "Nome" },
  { value: "EMAIL", label: "E-mail" },
  { value: "RECENT", label: "Mais recentes" },
];

/** Lista de membros; com um id no endereço (`#/membros/<id>`), a página daquele membro. */
export function MembersPage({ param: memberId }: PageProps) {
  const members = useCollection<Member, MemberSort>(membersApi.list, "NAME");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);

  // Salvar ou excluir avisa as listagens (api/changes), que buscam a página de novo
  function handleSaved() {
    setEditing(null);
  }

  return (
    <>
      {/* A lista fica montada (escondida) na página do membro: volta com a busca e a página */}
      <div hidden={Boolean(memberId)}>
        <CollectionView
          collection={members}
          title="Membros"
          countLabel={(total) =>
            `${total} ${total === 1 ? "membro cadastrado" : "membros cadastrados"}`
          }
          sortOptions={sortOptions}
          search={{ label: "Buscar membros", placeholder: "Buscar por nome ou e-mail" }}
          messages={{
            loading: "Carregando membros…",
            loadError: "Não foi possível carregar os membros.",
            emptyTitle: "Nenhum membro cadastrado",
            emptyText: "Adicione o primeiro membro da biblioteca.",
            notFound: (q) => `Nenhum membro encontrado para “${q}”.`,
          }}
          emptyIcon={GroupIcon}
          itemKey={(member) => member.id}
          onAdd={() => setEditing({})}
          renderItem={(member) => (
            <>
              <MemberPhoto member={member} size="small" />
              <div className="row-main">
                <a
                  className="row-title row-link"
                  href={`#/membros/${encodeURIComponent(member.id)}`}
                >
                  {member.name}
                </a>
                <span className="row-subtitle">{member.email}</span>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Editar ${member.name}`}
                  onClick={() => setEditing({ member })}
                >
                  <EditIcon className="icon" aria-hidden />
                </button>
                <button
                  type="button"
                  className="icon-button destructive"
                  aria-label={`Excluir ${member.name}`}
                  onClick={() => setDeleting(member)}
                >
                  <DeleteIcon className="icon" aria-hidden />
                </button>
              </div>
            </>
          )}
        />
      </div>
      {memberId && <MemberPage key={memberId} id={memberId} />}

      <AnimatePresence>
        {editing && (
          <MemberFormSheet
            key="form"
            member={editing.member}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
        {deleting && (
          <ConfirmDeleteDialog
            key="delete"
            name={deleting.name}
            conflictMessage="Este membro tem empréstimos ativos e não pode ser excluído."
            errorMessage="Não foi possível excluir o membro. Tente novamente."
            onConfirm={async () => {
              await membersApi.remove(deleting.id);
              setDeleting(null);
            }}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
