import React, { useState, useEffect } from 'react';
import { X, Vote, CheckCircle2, ShieldCheck, UserCheck, Clock, BarChart3, AlertTriangle, Plus, Music, CheckSquare, Square } from 'lucide-react';
import type { Poll } from '../types/vote';
import { PollService, getUserVotedOptionIds } from '../lib/supabase';

interface PollDetailModalProps {
  poll: Poll | null;
  onClose: () => void;
  onVoteComplete: () => void;
}

export const PollDetailModal: React.FC<PollDetailModalProps> = ({ poll, onClose, onVoteComplete }) => {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [voterName, setVoterName] = useState<string>('');
  const [votedOptionIds, setVotedOptionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // New option add state
  const [newOptionText, setNewOptionText] = useState<string>('');
  const [isAddingOption, setIsAddingOption] = useState<boolean>(false);
  const [showAddInput, setShowAddInput] = useState<boolean>(false);

  useEffect(() => {
    if (poll) {
      const userVotes = getUserVotedOptionIds(poll.id);
      setVotedOptionIds(userVotes);
      setSelectedOptionIds([]);
      setErrorMsg('');
      setNewOptionText('');
      setShowAddInput(false);
    }
  }, [poll]);

  if (!poll) return null;

  const now = new Date();
  const startDate = new Date(poll.start_at);
  const endDate = new Date(poll.end_at);
  const isOngoing = now >= startDate && now <= endDate;
  const isEnded = now > endDate;

  const totalVotes = poll.options
    ? poll.options.reduce((sum, opt) => sum + opt.vote_count, 0)
    : 0;

  const hasVoted = votedOptionIds.length > 0;

  const toggleOptionSelection = (optionId: string) => {
    if (votedOptionIds.includes(optionId)) return; // Already voted for this option

    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleVoteSubmit = async () => {
    if (selectedOptionIds.length === 0) {
      setErrorMsg('투표할 항목을 하나 이상 선택해주세요.');
      return;
    }

    if (!poll.is_anonymous && !voterName.trim()) {
      setErrorMsg('공개 투표입니다. 이름 또는 닉네임을 입력해 주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const success = await PollService.castVote(poll.id, selectedOptionIds, voterName.trim());
      if (success) {
        setVotedOptionIds((prev) => [...prev, ...selectedOptionIds]);
        setSelectedOptionIds([]);
        onVoteComplete();
      } else {
        setErrorMsg('투표 처리에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMsg('오류가 발생했습니다: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionText.trim()) return;

    try {
      setIsAddingOption(true);
      setErrorMsg('');
      const added = await PollService.addOption(poll.id, newOptionText.trim());
      if (added) {
        if (!poll.options) poll.options = [];
        poll.options.push(added);
        setNewOptionText('');
        setShowAddInput(false);
        onVoteComplete();
      } else {
        setErrorMsg('항목 추가에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMsg('항목 추가 중 오류가 발생했습니다: ' + (err.message || err));
    } finally {
      setIsAddingOption(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isOngoing && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  진행 중
                </span>
              )}
              {isEnded && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  투표 마감
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                복수(중복) 투표 가능
              </span>
              {poll.is_anonymous ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  익명 투표
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <UserCheck className="w-3.5 h-3.5" />
                  공개 투표
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{poll.title}</h2>
            {poll.description && (
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{poll.description}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Public Vote Name Input */}
        {!poll.is_anonymous && isOngoing && (
          <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              투표자 이름 / 닉네임 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="예: 홍길동 (공개 투표용 이름)"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
        )}

        {/* Options List / Results */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              투표 항목 목록 (여러 개 선택 가능)
            </span>
            <span>총 {totalVotes}표</span>
          </div>

          {poll.options?.map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
            const isMyVote = votedOptionIds.includes(option.id);
            const isSelected = selectedOptionIds.includes(option.id);

            return (
              <div
                key={option.id}
                onClick={() => {
                  if (isOngoing && !isMyVote) {
                    toggleOptionSelection(option.id);
                  }
                }}
                className={`relative overflow-hidden p-4 rounded-xl border transition-all ${
                  isOngoing && !isMyVote ? 'cursor-pointer hover:border-indigo-500/60' : ''
                } ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-500 text-white ring-1 ring-indigo-500'
                    : isMyVote
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-white'
                    : 'bg-slate-950 border-slate-800/80 text-slate-200'
                }`}
              >
                {/* Background Result Progress Bar */}
                {(hasVoted || isEnded) && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 transition-all duration-500 opacity-20 ${
                      isMyVote ? 'bg-indigo-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 pr-4">
                    {/* Checkbox Icon */}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        isMyVote
                          ? 'bg-emerald-600 text-white'
                          : isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border border-slate-700 bg-slate-900 text-slate-600'
                      }`}
                    >
                      {isMyVote ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </div>

                    <span className="text-sm font-medium">{option.text}</span>

                    {isMyVote && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        투표함
                      </span>
                    )}
                  </div>

                  {/* Percentage & Vote Count */}
                  {(hasVoted || isEnded) && (
                    <div className="text-right shrink-0">
                      <span className="text-base font-bold text-white">{percentage}%</span>
                      <span className="block text-[11px] text-slate-400">{option.vote_count}표</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Option (Song) Section for anyone */}
        {isOngoing && (
          <div className="mb-8 p-4 rounded-xl bg-slate-950 border border-indigo-500/20">
            {!showAddInput ? (
              <button
                type="button"
                onClick={() => setShowAddInput(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-indigo-500/40 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <Music className="w-4 h-4" />
                <span>새 투표 항목(곡) 직접 추가하기</span>
              </button>
            ) : (
              <form onSubmit={handleAddOptionSubmit} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  추가할 투표 항목(곡 제목)을 입력하세요
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    placeholder="예: NewJeans - Supernatural"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isAddingOption || !newOptionText.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md disabled:opacity-50 transition-colors"
                  >
                    {isAddingOption ? '추가 중...' : '추가하기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddInput(false);
                      setNewOptionText('');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                  >
                    취소
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>마감일시: {new Date(poll.end_at).toLocaleString('ko-KR')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              닫기
            </button>

            {isOngoing && (
              <button
                onClick={handleVoteSubmit}
                disabled={isSubmitting || selectedOptionIds.length === 0}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Vote className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? '제출 중...'
                    : selectedOptionIds.length > 0
                    ? `${selectedOptionIds.length}개 항목 투표하기`
                    : '투표하기'}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
