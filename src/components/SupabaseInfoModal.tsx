import React, { useState } from 'react';
import { X, Database, Check, Copy, Terminal, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface SupabaseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseInfoModal: React.FC<SupabaseInfoModalProps> = ({ isOpen, onClose }) => {
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const envSample = `VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`;

  const sqlSample = `-- 1. Create Polls Table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_anonymous BOOLEAN DEFAULT true NOT NULL,
    start_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create Poll Options Table
CREATE TABLE IF NOT EXISTS public.poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    text VARCHAR(255) NOT NULL,
    link_url TEXT,
    vote_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create Votes Table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
    user_identifier VARCHAR(255) NOT NULL,
    voter_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(poll_id, user_identifier)
);

-- 4. Enable Row Level Security (RLS) & Policies for SELECT/INSERT/UPDATE/DELETE
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all polls" ON public.polls;
CREATE POLICY "Allow public all polls" ON public.polls FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all poll_options" ON public.poll_options;
CREATE POLICY "Allow public all poll_options" ON public.poll_options FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all votes" ON public.votes;
CREATE POLICY "Allow public all votes" ON public.votes FOR ALL USING (true) WITH CHECK (true);`;

  const copyToClipboard = (text: string, setFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Supabase 데이터베이스 연동 안내</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                현재 상태: {isSupabaseConfigured ? '🟢 Supabase 라이브 연결 완료' : '🟡 LocalStorage 하이브리드 데모 모드'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            현재 <strong>JB Vote Site</strong>는 Supabase API Key가 설정되지 않더라도 서비스의 모든 기능(투표 등록, 기간 설정, 익명/공개 투표, 결과 그래프 등)을 자유롭게 테스트할 수 있도록 LocalStorage 하이브리드 모드로 동작하고 있습니다.
          </p>

          {/* Step 1: Env file */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                환경 변수 설정 (.env.local)
              </span>
              <button
                onClick={() => copyToClipboard(envSample, setCopiedEnv)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEnv ? '복사 완료!' : '코드 복사'}</span>
              </button>
            </h3>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono overflow-x-auto">
              {envSample}
            </pre>
          </div>

          {/* Step 2: SQL Script */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Supabase SQL Editor 실행 (테이블 생성)
              </span>
              <button
                onClick={() => copyToClipboard(sqlSample, setCopiedSql)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? '복사 완료!' : 'SQL 복사'}</span>
              </button>
            </h3>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono max-h-48 overflow-y-auto">
              {sqlSample}
            </pre>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              프로젝트 루트의 <code className="text-indigo-300">supabase_schema.sql</code> 파일에도 전체 스크립트가 준비되어 있습니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-800">
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <span>Supabase 대시보드 바로가기</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            확인 완료
          </button>
        </div>

      </div>
    </div>
  );
};
