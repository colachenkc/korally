export type MatchStatus = "scheduled" | "preparing" | "in_progress" | "finished" | "delayed" | "cancelled";

export type TableStatus = "idle" | "preparing" | "in_progress" | "delayed" | "finished";

export type Match = {
  id: number;
  tournament_id: number;
  table_id: number | null;
  match_no: string;
  category_label: string | null;
  status: MatchStatus;
  player_a_name_manual: string | null;
  player_b_name_manual: string | null;
  winner_name_manual: string | null;
  score_summary: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  remarks: string | null;
};

export type CallSide = "A" | "B" | "BOTH";

export type TableItem = {
  id: number;
  tournament_id: number;
  table_no: string;
  zone: string | null;
  status: TableStatus;
  current_match_id: number | null;
  referees_text: string | null;
  call_side: CallSide | null;
  call_player_name: string | null;
  call_created_at: string | null;
  call_broadcasted_at: string | null;
  created_at: string;
  updated_at: string;
  current_match: Match | null;
};

export type MainDesk = {
  id: number;
  tournament_id: number;
  name: string;
  status_text: string | null;
  location: string | null;
  members_text: string | null;
};

export type TournamentStatus = "draft" | "ongoing" | "finished";

export const TOURNAMENT_STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "籌備中",
  ongoing: "進行中",
  finished: "已結束",
};

export type Tournament = {
  id: number;
  name: string;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  current_schedule_time: string | null;
  announcement_text: string | null;
  announcement_pdf_url: string | null;
};

export const SCHEDULE_CATEGORIES = [
  "時間表",
  "公開男單",
  "公開女單",
  "公開男團",
  "公開女團",
  "歡樂雙打",
] as const;

export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number];

// Public-facing groups used by the schedule page and the nav menu. The admin
// upload UI still works against the 6 individual SCHEDULE_CATEGORIES above.
export const SCHEDULE_GROUPS = [
  { key: "timetable", label: "時程表", categories: ["時間表"] },
  { key: "singles", label: "公開男女單", categories: ["公開男單", "公開女單"] },
  { key: "teams", label: "公開男女團", categories: ["公開男團", "公開女團"] },
  { key: "doubles", label: "歡樂雙打", categories: ["歡樂雙打"] },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  categories: readonly ScheduleCategory[];
}>;

export type ScheduleGroupKey = (typeof SCHEDULE_GROUPS)[number]["key"];

export type ScheduleDoc = {
  id: number;
  tournament_id: number;
  title: string;
  pdf_url: string;
  effective_date: string | null;
  note: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type TeamDivision = "men" | "women";

export const TEAM_DIVISION_LABEL: Record<TeamDivision, string> = {
  men: "公開男團",
  women: "公開女團",
};

export type Team = {
  id: number;
  tournament_id: number;
  division: TeamDivision;
  name: string;
  department: string | null;
  members_text: string | null;
  display_order: number;
};

export type ParticipantCategory = "men_singles" | "women_singles" | "doubles";

export const PARTICIPANT_CATEGORY_LABEL: Record<ParticipantCategory, string> = {
  men_singles: "公開男單",
  women_singles: "公開女單",
  doubles: "歡樂雙打",
};

export type Participant = {
  id: number;
  tournament_id: number;
  category: ParticipantCategory;
  name: string;
  team: string | null;
  student_id: string | null;
  pair_no: number | null;
  seed: number | null;
  checked_in: boolean;
  checked_in_at: string | null;
};
