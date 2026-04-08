import type { SRNode, TeamProps } from "@pagoda/schema";
import type { PreviewInputTeam } from "../legacy-types/preview-input.js";
import type { DatabaseStaffMember } from "../legacy-types/database-data.js";

export function buildTeam(
  team: PreviewInputTeam,
  staffMembers: DatabaseStaffMember[],
): SRNode {
  const props: TeamProps = {
    title: team.title ?? "Our Team",
    richText: team.text,
    members: staffMembers.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      title: s.title,
      bio: s.bio,
      photoUrl: s.photo_url,
      email: s.email,
      specialties: s.specialties,
    })),
  };
  return {
    type: "team",
    id: "about",
    props: props as unknown as Record<string, unknown>,
  };
}
