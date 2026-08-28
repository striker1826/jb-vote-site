import { createClient } from '@supabase/supabase-js';
import type { Poll, PollOption } from '../types/vote';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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

let inMemorySessionVoterId = '';
export function getVoterIdentifier(kakaoUserId?: string): string {
  if (kakaoUserId) {
    return 'kakao_' + kakaoUserId;
  }
  if (!inMemorySessionVoterId) {
    inMemorySessionVoterId = 'voter_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }
  return inMemorySessionVoterId;
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
        console.error('Supabase fetch error:', err);
      }
    }
    return [];
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

    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase가 연결되어 있지 않습니다. .env 설정을 확인해주세요.');
    }

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
  },

  async castVote(pollId: string, optionIds: string | string[], voterName?: string, kakaoUserId?: string): Promise<boolean> {
    const voterId = getVoterIdentifier(kakaoUserId);
    const targets = Array.isArray(optionIds) ? optionIds : [optionIds];

    if (!isSupabaseConfigured || !supabase) return false;

    try {
      // 1. Fetch existing votes for this poll from Supabase
      const { data: existingVotes, error: findErr } = await supabase
        .from('votes')
        .select('id, option_id, user_identifier')
        .eq('poll_id', pollId);

      if (findErr) console.warn('Supabase fetch existing votes error:', findErr);

      // Filter in JS using startsWith for exact voterId matching
      const userExistingVotes = (existingVotes || []).filter((v: { user_identifier: string }) =>
        v.user_identifier.startsWith(`${voterId}_`)
      );

      const existingOptIds = userExistingVotes.map((v: { option_id: string }) => v.option_id);

      // 2. Delete votes for options that are no longer selected by user
      const toDelete = userExistingVotes.filter((v: { option_id: string }) => !targets.includes(v.option_id));
      if (toDelete.length > 0) {
        const deleteIds = toDelete.map((v: { id: string }) => v.id);
        const { error: delErr } = await supabase.from('votes').delete().in('id', deleteIds);
        if (delErr) {
          console.error('Supabase delete vote error:', delErr);
          throw delErr;
        }
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

      return true;
    } catch (err) {
      console.error('Supabase castVote failed:', err);
      return false;
    }
  },

  async addOption(pollId: string, optionText: string, linkUrl?: string): Promise<PollOption | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('poll_options')
        .insert([{ poll_id: pollId, text: optionText, link_url: linkUrl || null, vote_count: 0 }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Supabase addOption failed:', err);
      return null;
    }
  },

  async fetchUserVotedOptionIds(pollId: string, kakaoUserId?: string): Promise<string[]> {
    const voterId = getVoterIdentifier(kakaoUserId);
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('votes')
          .select('option_id, user_identifier')
          .eq('poll_id', pollId);

        if (!error && data) {
          const userVotes = data.filter((row: { user_identifier: string }) =>
            row.user_identifier.startsWith(`${voterId}_`)
          );
          return userVotes.map((row: { option_id: string }) => row.option_id);
        }
      } catch (err) {
        console.warn('Supabase fetchUserVotedOptionIds error:', err);
      }
    }
    return [];
  },
};
