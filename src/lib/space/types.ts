// @implements FEAT-114

export type SpaceRole = "owner" | "member";

export type SpaceMember = {
  user_id: string;
  email: string | null;
  role: SpaceRole;
  joined_at: number;
};

export type SpaceRecord = {
  space_id: string;
  display_name: string;
  owner_user_id: string;
  members: SpaceMember[];
  sheet_source_user_id: string;
  created_at: number;
  updated_at: number;
};

export type SpaceInvite = {
  space_id: string;
  created_by: string;
  email: string | null;
  expires_at: number;
  created_at: number;
};
