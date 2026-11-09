import { json, request } from "./client";
import { pageUrl, type Page, type PageQuery } from "./page";

export type Member = {
  id: string;
  name: string;
  email: string;
  /** `null` sem foto; muda a cada foto nova (vai no endereço da imagem). */
  photoVersion: number | null;
};

export type MemberInput = Pick<Member, "name" | "email">;

/** Ordenações aceitas pela API (`MemberSort` do back). */
export type MemberSort = "NAME" | "EMAIL" | "RECENT";

/** Endereço da foto do membro, com a versão (uma foto nova tem outro endereço); `null` sem foto. */
export const photoUrl = (member: Pick<Member, "id" | "photoVersion">) =>
  member.photoVersion === null
    ? null
    : `/api/members/${encodeURIComponent(member.id)}/photo?v=${member.photoVersion}`;

export const membersApi = {
  list: (query: PageQuery<MemberSort>, signal?: AbortSignal) =>
    request<Page<Member>>(pageUrl("/api/members", query), { signal }),
  get: (id: string, signal?: AbortSignal) => request<Member>(`/api/members/${id}`, { signal }),
  create: (member: MemberInput) => request<Member>("/api/members", json("POST", member)),
  update: (id: string, member: MemberInput) =>
    request<Member>(`/api/members/${id}`, json("PUT", member)),
  remove: (id: string) => request<void>(`/api/members/${id}`, { method: "DELETE" }),
  /** Envia a foto já recortada (JPEG). */
  changePhoto: (id: string, photo: Blob) =>
    request<Member>(`/api/members/${id}/photo`, { method: "PUT", body: photo }),
  removePhoto: (id: string) => request<Member>(`/api/members/${id}/photo`, { method: "DELETE" }),
};
