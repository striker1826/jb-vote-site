import React, { useEffect, useState } from 'react';
import { Clock, ShieldCheck, UserCheck, CheckCircle2, Vote, ArrowRight, Bookmark } from 'lucide-react';
import type { Poll } from '../types/vote';
import { PollService, hasPollDraft, type UserProfile } from '../lib/supabase';

interface PollCardProps {
  poll: Poll;
  user?: UserProfile | null;
  onSelect: (poll: Poll) => void;
}

export const PollCard: React.FC<PollCardProps> = ({ poll, user, onSelect }) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const now = new Date();
  const startDate = new Date(poll.start_at);
  const endDate = new Date(poll.end_at);

  const isOngoing = now >= startDate && now <= endDate;
  const isEnded = now > endDate;
  const isUpcoming = now < startDate;

  const totalVotes = poll.options
    ? poll.options.reduce((sum, opt) => sum + opt.vote_count, 0)
    : 0;

  useEffect(() => {
    PollService.fetchUserVotedOptionIds(poll.id, user?.id).then((userVotes) => {
      const voted = userVotes.length > 0;
      setHasVoted(voted);
      setHasDraft(!voted && hasPollDraft(poll.id));
    });

    const updateTimer = () => {
      const current = new Date();
      if (current < startDate) {
        const diffSec = Math.floor((startDate.getTime() - current.getTime()) / 1000);
        const days = Math.floor(diffSec / 86400);
        const hours = Math.floor((diffSec % 86400) / 3600);
        setTimeLeft(`시작까지 ${days > 0 ? `${days}일 ` : ''}${hours}시간 남음`);
      } else if (current <= endDate) {
        const diffSec = Math.floor((endDate.getTime() - current.getTime()) / 1000);
        const days = Math.floor(diffSec / 86400);
        const hours = Math.floor((diffSec % 86400) / 3600);
        const mins = Math.floor((diffSec % 3600) / 60);
        if (days > 0) {
          setTimeLeft(`${days}일 ${hours}시간 남음`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}시간 ${mins}분 남음`);
        } else {
          setTimeLeft(`${mins}분 남음`);
        }
      } else {
        setTimeLeft('투표 마감');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [poll.id, poll.start_at, poll.end_at]);

  return (
    <div
      onClick={() => onSelect(poll)}
      className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Top Badges */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {/* Status */}
            {isOngoing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                진행 중
              </span>
            )}
            {isUpcoming && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                예정됨
              </span>
            )}
            {isEnded && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                마감됨
              </span>
            )}

            {/* Anonymous Badge */}
            {poll.is_anonymous ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                익명
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                <UserCheck className="w-3 h-3 text-violet-400" />
                공개
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5">
            {hasDraft && !hasVoted && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                중간 저장됨
              </span>
            )}
            {hasVoted && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                참여 완료
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2">
          {poll.title}
        </h3>

        {/* Description */}
        {poll.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-4">
            {poll.description}
          </p>
        )}
      </div>

      {/* Footer Meta & Action */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-300 font-medium">
            <Vote className="w-3.5 h-3.5 text-indigo-400" />
            {totalVotes}표 참여
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {timeLeft}
          </span>
        </div>

        <div className="flex items-center gap-1 font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
          <span>{hasVoted || isEnded ? '결과 보기' : '투표하기'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
