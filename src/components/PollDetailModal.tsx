import React, { useState, useEffect } from 'react';
import { X, Vote, CheckCircle2, ShieldCheck, UserCheck, Clock, BarChart3, AlertTriangle, Plus, Music, CheckSquare, Square, ExternalLink, Video, Link as LinkIcon, Bookmark, Save, RotateCcw } from 'lucide-react';

import type { Poll } from '../types/vote';
import { PollService, getUserVotedOptionIds, getPollDraft, savePollDraft, clearPollDraft } from '../lib/supabase';

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

  // Draft state & feedback
  const [draftInfo, setDraftInfo] = useState<{ isLoaded: boolean; savedAt?: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  // New option add state
  const [newOptionText, setNewOptionText] = useState<string>('');
  const [newOptionLink, setNewOptionLink] = useState<string>('');
  const [isAddingOption, setIsAddingOption] = useState<boolean>(false);
  const [showAddInput, setShowAddInput] = useState<boolean>(false);

  useEffect(() => {
    if (poll) {
      const userVotes = getUserVotedOptionIds(poll.id);
      setVotedOptionIds(userVotes);
      setErrorMsg('');
      setNewOptionText('');
      setNewOptionLink('');
      setShowAddInput(false);
      setToastMsg('');

      // Check for saved draft if user hasn't voted yet
      if (userVotes.length === 0) {
        const draft = getPollDraft(poll.id);
        if (draft) {
          setSelectedOptionIds(draft.selectedOptionIds || []);
          setVoterName(draft.voterName || '');
          setDraftInfo({ isLoaded: true, savedAt: draft.savedAt });
        } else {
          setSelectedOptionIds([]);
          setVoterName('');
          setDraftInfo(null);
        }
      } else {
        setSelectedOptionIds([]);
        setVoterName('');
        setDraftInfo(null);
      }
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

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

  const toggleOptionSelection = (optionId: string) => {
    if (votedOptionIds.includes(optionId)) return;

    setSelectedOptionIds((prev) => {
      const next = prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId];

      // Auto-save draft on selection change
      if (isOngoing && !hasVoted) {
        savePollDraft(poll.id, next, voterName);
      }
      return next;
    });
  };

  const handleVoterNameChange = (val: string) => {
    setVoterName(val);
    if (isOngoing && !hasVoted) {
      savePollDraft(poll.id, selectedOptionIds, val);
    }
  };

  const handleManualSaveDraft = () => {
    if (!poll || hasVoted || !isOngoing) return;
    savePollDraft(poll.id, selectedOptionIds, voterName);
    const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDraftInfo({ isLoaded: true, savedAt: nowTime });
    showToast('💾 선택 항목이 중간 저장되었습니다.');
  };

  const handleResetDraft = () => {
    if (!poll) return;
    clearPollDraft(poll.id);
    setSelectedOptionIds([]);
    setVoterName('');
    setDraftInfo(null);
    showToast('🗑️ 중간 저장된 내용이 초기화되었습니다.');
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
        clearPollDraft(poll.id);
        setVotedOptionIds((prev) => [...prev, ...selectedOptionIds]);
        setSelectedOptionIds([]);
        setDraftInfo(null);
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
      const added = await PollService.addOption(poll.id, newOptionText.trim(), newOptionLink.trim());
      if (added) {
        if (!poll.options) poll.options = [];
        poll.options.push(added);
        setNewOptionText('');
        setNewOptionLink('');
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

  const isYouTubeUrl = (url?: string) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
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

        {toastMsg && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center justify-between animate-fade-in shadow-lg">
            <span>{toastMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Draft Loaded / Saved Notice Banner */}
        {draftInfo && isOngoing && !hasVoted && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                중간 저장된 선택 항목이 불러와졌습니다.
                {draftInfo.savedAt && <span className="text-amber-400/80 ml-1">({draftInfo.savedAt} 저장됨)</span>}
              </span>
            </div>
            <button
              onClick={handleResetDraft}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold border border-amber-500/30 transition-colors shrink-0"
              title="중간 저장 내용 초기화"
            >
              <RotateCcw className="w-3 h-3" />
              <span>초기화</span>
            </button>
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
              onChange={(e) => handleVoterNameChange(e.target.value)}
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
            const hasLink = Boolean(option.link_url && option.link_url.trim());

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
                  <div className="flex items-center gap-3 flex-1 pr-4 min-w-0">
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

                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-sm font-medium">{option.text}</span>

                      {/* YouTube / Reference Link Button */}
                      {hasLink && (
                        <a
                          href={option.link_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                            isYouTubeUrl(option.link_url)
                              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30'
                          }`}
                        >
                          {isYouTubeUrl(option.link_url) ? (
                            <Video className="w-3 h-3 text-rose-400" />
                          ) : (
                            <ExternalLink className="w-3 h-3 text-indigo-400" />
                          )}

                          <span>{isYouTubeUrl(option.link_url) ? '유튜브 듣기' : '링크 보러가기'}</span>
                        </a>
                      )}

                      {isMyVote && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          투표함
                        </span>
                      )}
                    </div>
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
                  추가할 투표 항목(곡 제목)과 링크를 입력하세요
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    placeholder="예: NewJeans - Supernatural"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <input
                      type="url"
                      value={newOptionLink}
                      onChange={(e) => setNewOptionLink(e.target.value)}
                      placeholder="유튜브 / 참고 링크 (선택, https://...)"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddInput(false);
                      setNewOptionText('');
                      setNewOptionLink('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingOption || !newOptionText.trim()}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md disabled:opacity-50 transition-colors"
                  >
                    {isAddingOption ? '추가 중...' : '추가하기'}
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

            {isOngoing && !hasVoted && (
              <button
                type="button"
                onClick={handleManualSaveDraft}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-medium text-sm transition-all shadow-sm"
                title="투표 선택 사항을 임시로 중간 저장합니다"
              >
                <Save className="w-4 h-4 text-indigo-400" />
                <span>중간 저장</span>
              </button>
            )}

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
