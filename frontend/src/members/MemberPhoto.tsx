import { photoUrl, type Member } from "../api/members";
import { PersonIcon } from "../components/icons";
import { ZoomableImage } from "../components/ZoomableImage";

type Props = {
  member: Pick<Member, "id" | "name" | "photoVersion">;
  /** `small` na linha da lista, `large` na página do membro. */
  size: "small" | "large";
};

/** Foto do membro (já recortada em 2:3 ao enviar); sem foto, o ícone de pessoa. */
export function MemberPhoto({ member, size }: Props) {
  const src = photoUrl(member);
  return (
    <ZoomableImage
      src={src}
      zoomSrc={src}
      label={`foto de ${member.name}`}
      size={size}
      placeholderIcon={PersonIcon}
    />
  );
}
