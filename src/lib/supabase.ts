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

export interface UserProfile {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
}

export const AuthService = {
  async signInWithKakao() {
    if (!isSupabaseConfigured || !supabase) {
      alert('Supabase가 연결되어 있지 않습니다. .env 설정을 확인해주세요.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        scopes: 'profile_nickname profile_image',
        queryParams: {
          scope: 'profile_nickname,profile_image',
        },
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('Kakao login error:', error);
      alert('카카오 로그인 요청에 실패했습니다: ' + error.message);
    }
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username || '카카오 사용자',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      email: user.email,
    };
  },

  onAuthStateChange(callback: (user: UserProfile | null) => void) {
    if (!isSupabaseConfigured || !supabase) {
      callback(null);
      return () => {};
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        callback({
          id: u.id,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.user_metadata?.preferred_username || '카카오 사용자',
          avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture,
          email: u.email,
        });
      } else {
        callback(null);
      }
    });
    return () => subscription.unsubscribe();
  },
};

export function getVoterIdentifier(kakaoUserId?: string): string {
  if (kakaoUserId) {
    return 'kakao_' + kakaoUserId;
  }
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
  votes[pollId] = optionIds;
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
          .select('*')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true });

        if (optsErr) throw optsErr;

        const { data: votesData } = await supabase
          .from('votes')
          .select('option_id');

        const voteCountsByOption: Record<string, number> = {};
        if (votesData && votesData.length > 0) {
          votesData.forEach((v: { option_id: string }) => {
            voteCountsByOption[v.option_id] = (voteCountsByOption[v.option_id] || 0) + 1;
          });
        }

        return (polls || []).map((poll: Poll) => {
          const pollOptions = (options || [])
            .filter((opt: PollOption) => opt.poll_id === poll.id)
            .map((opt: PollOption) => ({
              ...opt,
              vote_count: votesData ? (voteCountsByOption[opt.id] || 0) : opt.vote_count,
            }))
            .sort((a: PollOption, b: PollOption) => {
              if (a.created_at && b.created_at && a.created_at !== b.created_at) {
                return a.created_at.localeCompare(b.created_at);
              }
              return a.id.localeCompare(b.id);
            });
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
          .select()
          .order('created_at', { ascending: true })
          .order('id', { ascending: true });

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

  async castVote(pollId: string, optionIds: string | string[], voterName?: string, kakaoUserId?: string): Promise<boolean> {
    const voterId = getVoterIdentifier(kakaoUserId);
    const targets = Array.isArray(optionIds) ? optionIds : [optionIds];

    if (targets.length === 0) return false;

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Fetch existing votes for this user on this poll from Supabase
        const { data: existingVotes, error: findErr } = await supabase
          .from('votes')
          .select('id, option_id')
          .eq('poll_id', pollId)
          .like('user_identifier', `${voterId}_%`);

        if (findErr) console.warn('Supabase fetch existing votes error:', findErr);

        const existingOptIds = (existingVotes || []).map((v: { option_id: string }) => v.option_id);

        // 2. Delete votes that are no longer selected by user
        const toDelete = (existingVotes || []).filter((v: { option_id: string }) => !targets.includes(v.option_id));
        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((v: { id: string }) => v.id);
          const { error: delErr } = await supabase.from('votes').delete().in('id', deleteIds);
          if (delErr) console.warn('Supabase delete vote error:', delErr);
        }

        // 3. Insert new targets that were not previously in DB
        const toInsert = targets.filter((optId) => !existingOptIds.includes(optId));
        if (toInsert.length > 0) {
          const inserts = toInsert.map((optId) => ({
            poll_id: pollId,
            option_id: optId,
            user_identifier: voterId + '_' + optId,
            voter_name: voterName || null,
          }));
          const { error: voteErr } = await supabase.from('votes').insert(inserts);
          if (voteErr) {
            console.error('Supabase vote insert error:', voteErr);
            throw voteErr;
          }
        }

        // 4. Update vote_count on poll_options table in Supabase
        const { data: allVotes } = await supabase
          .from('votes')
          .select('option_id')
          .eq('poll_id', pollId);

        if (allVotes) {
          const counts: Record<string, number> = {};
          allVotes.forEach((row: { option_id: string }) => {
            counts[row.option_id] = (counts[row.option_id] || 0) + 1;
          });

          const { data: pollOptions } = await supabase
            .from('poll_options')
            .select('id')
            .eq('poll_id', pollId);

          if (pollOptions) {
            for (const opt of pollOptions) {
              const newCount = counts[opt.id] || 0;
              await supabase
                .from('poll_options')
                .update({ vote_count: newCount })
                .eq('id', opt.id);
            }
          }
        }

        markUserVotedOptions(pollId, targets);
        return true;
      } catch (err) {
        console.warn('Supabase castVote failed, trying local store voting fallback:', err);
      }
    }

    // Fallback local store voting
    const previousVotedOptionIds = getUserVotedOptionIds(pollId);
    const polls = await PollService.fetchPolls();
    const targetPollIndex = polls.findIndex((p) => p.id === pollId);
    if (targetPollIndex !== -1 && polls[targetPollIndex].options) {
      // Decrement vote counts for previously voted options
      previousVotedOptionIds.forEach((prevId) => {
        const optionIndex = polls[targetPollIndex].options!.findIndex((o) => o.id === prevId);
        if (optionIndex !== -1 && polls[targetPollIndex].options![optionIndex].vote_count > 0) {
          polls[targetPollIndex].options![optionIndex].vote_count -= 1;
        }
      });
      // Increment vote counts for newly target options
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

  async fetchUserVotedOptionIds(pollId: string, kakaoUserId?: string): Promise<string[]> {
    const voterId = getVoterIdentifier(kakaoUserId);
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('votes')
          .select('option_id')
          .eq('poll_id', pollId)
          .like('user_identifier', `${voterId}_%`);

        if (!error && data) {
          const ids = data.map((row: { option_id: string }) => row.option_id);
          markUserVotedOptions(pollId, ids);
          return ids;
        }
      } catch (err) {
        console.warn('Supabase fetchUserVotedOptionIds error:', err);
      }
    }
    return getUserVotedOptionIds(pollId);
  },
};
