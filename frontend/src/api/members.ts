import { json, request } from "./client";

export type Member = {
  id: string;
  name: string;
  email: string;
};

export type MemberInput = Pick<Member, "name" | "email">;

export const membersApi = {
  list: () => request<Member[]>("/api/members"),
  create: (member: MemberInput) => request<Member>("/api/members", json("POST", member)),
  update: (id: string, member: MemberInput) =>
    request<Member>(`/api/members/${id}`, json("PUT", member)),
  remove: (id: string) => request<void>(`/api/members/${id}`, { method: "DELETE" }),
};
