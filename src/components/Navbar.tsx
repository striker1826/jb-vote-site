import React from "react";
import { Plus, LogOut, MessageCircle } from "lucide-react";
import { AuthService } from "../lib/supabase";
import type { UserProfile } from "../lib/supabase";

interface NavbarProps {
  user: UserProfile | null;
  onOpenCreate: () => void;
  onOpenDbConfig?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenCreate }) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                JB Vote
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Kakao Auth Button */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 pl-3 rounded-xl">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-6 h-6 rounded-full ring-1 ring-amber-400/50 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#FEE500] text-black font-bold text-xs flex items-center justify-center">
                  {user.name.slice(0, 1)}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                {user.name}
              </span>
              <button
                onClick={() => AuthService.signOut()}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => AuthService.signInWithKakao()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] font-bold text-xs shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-[#191919]" />
              <span>카카오 로그인</span>
            </button>
          )}

          {/* Create Vote Button */}
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">새 투표 만들기</span>
            <span className="sm:hidden">만들기</span>
          </button>
        </div>
      </div>
    </header>
  );
};
