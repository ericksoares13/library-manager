import { json, request } from "./client";
import { pageUrl, type Page, type PageQuery } from "./page";

export type Member = {
  id: string;
  name: string;
  email: string;
};

export type MemberInput = Pick<Member, "name" | "email">;

/** Ordenações aceitas pela API (`MemberSort` do back). */
export type MemberSort = "NAME" | "EMAIL" | "RECENT";

export const membersApi = {
  list: (query: PageQuery<MemberSort>, signal?: AbortSignal) =>
    request<Page<Member>>(pageUrl("/api/members", query), { signal }),
  create: (member: MemberInput) => request<Member>("/api/members", json("POST", member)),
  update: (id: string, member: MemberInput) =>
    request<Member>(`/api/members/${id}`, json("PUT", member)),
  remove: (id: string) => request<void>(`/api/members/${id}`, { method: "DELETE" }),
};
