export interface PollOptionVoter {
  voter_name?: string;
  user_identifier: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  link_url?: string;
  vote_count: number;
  created_at?: string;
  voters?: PollOptionVoter[];
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  start_at: string;
  end_at: string;
  created_at: string;
  options?: PollOption[];
  total_votes?: number;
}

export interface VoteRecord {
  id: string;
  poll_id: string;
  option_id: string;
  user_identifier: string;
  voter_name?: string;
  created_at: string;
}

export type PollStatusFilter = 'all' | 'ongoing' | 'ended' | 'upcoming';

