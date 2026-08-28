import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { PollService } from "../lib/supabase";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const now = new Date();
  const defaultEnd = new Date(now.getTime() + 3 * 24 * 3600 * 1000);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [startAt, setStartAt] = useState(now.toISOString().slice(0, 16));
  const [endAt, setEndAt] = useState(defaultEnd.toISOString().slice(0, 16));
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      setErrorMsg("투표 항목은 최소 2개 이상이어야 합니다.");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
    setErrorMsg("");
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const setDurationPreset = (days: number) => {
    const start = new Date(startAt || Date.now());
    const end = new Date(start.getTime() + days * 24 * 3600 * 1000);
    setEndAt(end.toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim()) {
      setErrorMsg("투표 제목을 입력해주세요.");
      return;
    }

    const validOptions = options
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);
    if (validOptions.length < 2) {
      setErrorMsg("최소 2개 이상의 투표 항목을 작성해주세요.");
      return;
    }

    if (new Date(startAt) >= new Date(endAt)) {
      setErrorMsg("종료 일시는 시작 일시보다 나중이어야 합니다.");
      return;
    }

    try {
      setIsSubmitting(true);
      await PollService.createPoll({
        title: title.trim(),
        description: description.trim(),
        is_anonymous: isAnonymous,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        options: validOptions,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg("투표 생성 중 오류가 발생했습니다: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block animate-pulse" />
              새 투표 등록하기
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              투표 기간, 익명 여부, 투표 항목을 설정하여 수월하게 시작하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              투표 제목 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 공연 곡 선정"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              투표 상세 설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="참여자들이 투표 주제를 쉽게 이해할 수 있도록 부연 설명을 적어주세요."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all resize-none"
            />
          </div>

          {/* Anonymous Option */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              투표 방식 (익명 여부)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsAnonymous(true)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  isAnonymous
                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <ShieldCheck
                  className={`w-5 h-5 ${isAnonymous ? "text-indigo-400" : "text-slate-500"}`}
                />
                <div>
                  <div className="text-sm font-semibold text-white">
                    익명 투표
                  </div>
                  <div className="text-xs text-slate-400">
                    투표자의 신원이 공개되지 않습니다
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsAnonymous(false)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  !isAnonymous
                    ? "bg-violet-600/10 border-violet-500 text-violet-300 ring-1 ring-violet-500"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <UserCheck
                  className={`w-5 h-5 ${!isAnonymous ? "text-violet-400" : "text-slate-500"}`}
                />
                <div>
                  <div className="text-sm font-semibold text-white">
                    공개 투표
                  </div>
                  <div className="text-xs text-slate-400">
                    투표 시 이름/닉네임을 작성합니다
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Date Period */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                투표 진행 기간
              </label>
              {/* Preset Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDurationPreset(1)}
                  className="px-2 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  +1일
                </button>
                <button
                  type="button"
                  onClick={() => setDurationPreset(3)}
                  className="px-2 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  +3일
                </button>
                <button
                  type="button"
                  onClick={() => setDurationPreset(7)}
                  className="px-2 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  +1주일
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-400 mb-1 block">
                  시작 일시
                </span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <span className="text-xs text-slate-400 mb-1 block">
                  종료 일시
                </span>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Poll Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200">
                투표 항목 등록 <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs text-slate-400">최소 2개 항목</span>
            </div>

            <div className="space-y-2.5">
              {options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-400 shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`투표 항목 ${idx + 1} 내용`}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="항목 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddOption}
              className="mt-3 w-full py-2.5 border border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl text-xs font-medium text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>항목 추가하기</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "등록 중..." : "투표 등록 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
