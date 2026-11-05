import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { membersApi, type Member } from "../api/members";
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog";
import { AddIcon, DeleteIcon, EditIcon, GroupIcon, SearchIcon } from "../components/icons";
import { settle } from "../components/motion";
import { matches } from "../components/search";
import { MemberFormSheet } from "./MemberFormSheet";

type Editing = { member?: Member } | null;

export function MembersPage() {
  const reduceMotion = useReducedMotion();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);

  useEffect(() => {
    let active = true;
    membersApi.list().then(
      (result) => active && setMembers(result),
      () => active && setLoadFailed(true),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setLoadFailed(false);
    setAttempt(attempt + 1);
  }

  function handleSaved(saved: Member) {
    setMembers((current) => {
      const list = current ?? [];
      return list.some((member) => member.id === saved.id)
        ? list.map((member) => (member.id === saved.id ? saved : member))
        : [...list, saved];
    });
    setEditing(null);
  }

  function handleDeleted(id: string) {
    setMembers((current) => (current ?? []).filter((member) => member.id !== id));
    setDeleting(null);
  }

  const visibleMembers = (members ?? []).filter((member) =>
    matches(query, member.name, member.email),
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="display">Membros</h1>
          {members && members.length > 0 && (
            <p className="secondary">
              {members.length} {members.length === 1 ? "membro cadastrado" : "membros cadastrados"}
            </p>
          )}
        </div>
        <button type="button" className="button primary" onClick={() => setEditing({})}>
          <AddIcon className="icon" aria-hidden />
          Adicionar
        </button>
      </header>

      {loadFailed ? (
        <div role="alert" className="notice">
          <p>Não foi possível carregar os membros.</p>
          <button type="button" className="button" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      ) : members === null ? (
        <p role="status" className="secondary">
          Carregando membros…
        </p>
      ) : members.length === 0 ? (
        <div className="empty">
          <GroupIcon className="empty-icon" aria-hidden />
          <h2>Nenhum membro cadastrado</h2>
          <p className="secondary">Adicione o primeiro membro da biblioteca.</p>
        </div>
      ) : (
        <>
          <label className="search">
            <SearchIcon className="icon" aria-hidden />
            <input
              type="search"
              placeholder="Buscar por nome ou e-mail"
              aria-label="Buscar membros"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {visibleMembers.length === 0 ? (
            <p className="secondary">Nenhum membro encontrado para “{query}”.</p>
          ) : (
            <ul className="list" aria-label="Membros">
              <AnimatePresence initial={false}>
                {visibleMembers.map((member) => (
                  <motion.li
                    key={member.id}
                    layout={!reduceMotion}
                    className="row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={settle}
                  >
                    <div className="row-main">
                      <span className="row-title">{member.name}</span>
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
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}

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
            onConfirm={() => membersApi.remove(deleting.id).then(() => handleDeleted(deleting.id))}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
