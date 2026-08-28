import { createClient } from '@supabase/supabase-js';
import type { Poll, PollOption } from '../types/vote';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Clean URL by stripping /rest/v1/ or trailing slash if present
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial polls - empty by default
const INITIAL_MOCK_POLLS: Poll[] = [];

const LOCAL_STORAGE_POLLS_KEY = 'jb_vote_site_polls';
const LOCAL_STORAGE_VOTES_KEY = 'jb_vote_site_user_votes';
const LOCAL_STORAGE_DRAFTS_KEY = 'jb_vote_site_poll_drafts';

export function getVoterIdentifier(): string {
  let id = localStorage.getItem('jb_vote_voter_id');
  if (!id) {
    id = 'voter_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('jb_vote_voter_id', id);
  }
  return id;
}

export interface PollDraft {
  selectedOptionIds: string[];
  voterName: string;
  savedAt: string;
}

export function getPollDraft(pollId: string): PollDraft | null {
  try {
    const drafts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DRAFTS_KEY) || '{}');
    const draft = drafts[pollId];
    if (draft && (draft.selectedOptionIds?.length > 0 || draft.voterName?.trim())) {
      return draft;
    }
  } catch (e) {
    console.error('Failed to parse poll drafts:', e);
  }
  return null;
}

export function savePollDraft(pollId: string, selectedOptionIds: string[], voterName: string): void {
  try {
    const drafts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DRAFTS_KEY) || '{}');
    if (selectedOptionIds.length === 0 && !voterName.trim()) {
      delete drafts[pollId];
    } else {
      drafts[pollId] = {
        selectedOptionIds,
        voterName: voterName.trim(),
        savedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    }
    localStorage.setItem(LOCAL_STORAGE_DRAFTS_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Failed to save poll draft:', e);
  }
}

export function clearPollDraft(pollId: string): void {
  try {
    const drafts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DRAFTS_KEY) || '{}');
    delete drafts[pollId];
    localStorage.setItem(LOCAL_STORAGE_DRAFTS_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Failed to clear poll draft:', e);
  }
}

export function hasPollDraft(pollId: string): boolean {
  return getPollDraft(pollId) !== null;
}

export function getUserVotedOptionIds(pollId: string): string[] {
  const votes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_VOTES_KEY) || '{}');
  const val = votes[pollId];
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export function markUserVotedOptions(pollId: string, optionIds: string[]) {
  const votes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_VOTES_KEY) || '{}');
  const existing = Array.isArray(votes[pollId]) ? votes[pollId] : (votes[pollId] ? [votes[pollId]] : []);
  const combined = Array.from(new Set([...existing, ...optionIds]));
  votes[pollId] = combined;
  localStorage.setItem(LOCAL_STORAGE_VOTES_KEY, JSON.stringify(votes));
}

// Backward compatibility helper
export function getUserVotedOptionId(pollId: string): string | null {
  const ids = getUserVotedOptionIds(pollId);
  return ids.length > 0 ? ids[0] : null;
}

export interface CreateOptionInput {
  text: string;
  link_url?: string;
}

// API Service Wrapper
export const PollService = {
  async fetchPolls(): Promise<Poll[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: polls, error: pollsErr } = await supabase
          .from('polls')
          .select('*')
          .order('created_at', { ascending: false });

        if (pollsErr) throw pollsErr;

        const { data: options, error: optsErr } = await supabase
          .from('poll_options')
          .select('*');

        if (optsErr) throw optsErr;

        return (polls || []).map((poll: Poll) => {
          const pollOptions = (options || []).filter((opt: PollOption) => opt.poll_id === poll.id);
          return {
            ...poll,
            options: pollOptions,
          };
        });
      } catch (err) {
        console.warn('Supabase fetch error, falling back to local storage:', err);
      }
    }

    // Local Storage Fallback
    const stored = localStorage.getItem(LOCAL_STORAGE_POLLS_KEY);
    if (!stored) {
      return INITIAL_MOCK_POLLS;
    }
    return JSON.parse(stored);
  },

  async createPoll(newPollData: {
    title: string;
    description: string;
    is_anonymous: boolean;
    start_at: string;
    end_at: string;
    options: (string | CreateOptionInput)[];
  }): Promise<Poll> {
    const formattedOptions: CreateOptionInput[] = newPollData.options.map((opt) =>
      typeof opt === 'string' ? { text: opt, link_url: '' } : opt
    );

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: poll, error: pollErr } = await supabase
          .from('polls')
          .insert([
            {
              title: newPollData.title,
              description: newPollData.description,
              is_anonymous: newPollData.is_anonymous,
              start_at: newPollData.start_at,
              end_at: newPollData.end_at,
            },
          ])
          .select()
          .single();

        if (pollErr) throw pollErr;

        const optionInserts = formattedOptions.map((opt) => ({
          poll_id: poll.id,
          text: opt.text,
          link_url: opt.link_url || null,
          vote_count: 0,
        }));

        const { data: options, error: optsErr } = await supabase
          .from('poll_options')
          .insert(optionInserts)
          .select();

        if (optsErr) throw optsErr;

        return {
          ...poll,
          options: options || [],
        };
      } catch (err) {
        console.warn('Supabase createPoll failed, falling back to local storage:', err);
      }
    }

    // Fallback Local Storage Creation
    const mockPollId = 'poll-' + Date.now();
    const createdPoll: Poll = {
      id: mockPollId,
      title: newPollData.title,
      description: newPollData.description,
      is_anonymous: newPollData.is_anonymous,
      start_at: newPollData.start_at,
      end_at: newPollData.end_at,
      created_at: new Date().toISOString(),
      options: formattedOptions.map((opt, idx) => ({
        id: `opt-${mockPollId}-${idx}`,
        poll_id: mockPollId,
        text: opt.text,
        link_url: opt.link_url,
        vote_count: 0,
      })),
    };

    const existing = await PollService.fetchPolls();
    const updated = [createdPoll, ...existing];
    localStorage.setItem(LOCAL_STORAGE_POLLS_KEY, JSON.stringify(updated));
    return createdPoll;
  },

  async castVote(pollId: string, optionIds: string | string[], voterName?: string): Promise<boolean> {
    const voterId = getVoterIdentifier();
    const targets = Array.isArray(optionIds) ? optionIds : [optionIds];

    if (targets.length === 0) return false;

    if (isSupabaseConfigured && supabase) {
      try {
        const inserts = targets.map((optId) => ({
          poll_id: pollId,
          option_id: optId,
          user_identifier: voterId + '_' + optId,
          voter_name: voterName || null,
        }));

        const { error: voteErr } = await supabase.from('votes').insert(inserts);

        if (voteErr) {
          console.warn('Vote insert error:', voteErr);
        }
        markUserVotedOptions(pollId, targets);
        return true;
      } catch (err) {
        console.warn('Supabase castVote failed, trying local increment:', err);
      }
    }

    // Fallback local store voting
    const polls = await PollService.fetchPolls();
    const targetPollIndex = polls.findIndex((p) => p.id === pollId);
    if (targetPollIndex !== -1 && polls[targetPollIndex].options) {
      targets.forEach((optId) => {
        const optionIndex = polls[targetPollIndex].options!.findIndex((o) => o.id === optId);
        if (optionIndex !== -1) {
          polls[targetPollIndex].options![optionIndex].vote_count += 1;
        }
      });
      localStorage.setItem(LOCAL_STORAGE_POLLS_KEY, JSON.stringify(polls));
      markUserVotedOptions(pollId, targets);
      return true;
    }
    return false;
  },

  async addOption(pollId: string, optionText: string, linkUrl?: string): Promise<PollOption | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('poll_options')
          .insert([{ poll_id: pollId, text: optionText, link_url: linkUrl || null, vote_count: 0 }])
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase addOption failed, falling back to local storage:', err);
      }
    }

    // Fallback local storage
    const polls = await PollService.fetchPolls();
    const pollIndex = polls.findIndex((p) => p.id === pollId);
    if (pollIndex !== -1) {
      const newOpt: PollOption = {
        id: `opt-${pollId}-${Date.now()}`,
        poll_id: pollId,
        text: optionText,
        link_url: linkUrl,
        vote_count: 0,
      };
      if (!polls[pollIndex].options) polls[pollIndex].options = [];
      polls[pollIndex].options!.push(newOpt);
      localStorage.setItem(LOCAL_STORAGE_POLLS_KEY, JSON.stringify(polls));
      return newOpt;
    }
    return null;
  },
};
