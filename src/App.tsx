import { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { PollCard } from "./components/PollCard";
import { CreatePollModal } from "./components/CreatePollModal";
import { PollDetailModal } from "./components/PollDetailModal";
import { SupabaseInfoModal } from "./components/SupabaseInfoModal";
import type { Poll, PollStatusFilter } from "./types/vote";
import { PollService, AuthService } from "./lib/supabase";
import type { UserProfile } from "./lib/supabase";
import {
  Search,
  Filter,
  RefreshCw,
  Vote,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";


export function App() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<PollStatusFilter>("all");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

  const loadPolls = async () => {
    setIsLoading(true);
    try {
      const data = await PollService.fetchPolls();
      setPolls(data);
    } catch (err) {
      console.error("Failed to load polls:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
    const unsubscribe = AuthService.onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const filteredPolls = polls.filter((poll) => {
    // Search query filter
    const matchesSearch =
      poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poll.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    const now = new Date();
    const startDate = new Date(poll.start_at);
    const endDate = new Date(poll.end_at);

    if (statusFilter === "ongoing") {
      return now >= startDate && now <= endDate;
    }
    if (statusFilter === "ended") {
      return now > endDate;
    }
    if (statusFilter === "upcoming") {
      return now < startDate;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        user={user}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenDbConfig={() => setIsDbModalOpen(true)}
      />

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950 py-12 sm:py-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 max-w-3xl mx-auto leading-tight">
            여기에서 곡 정해보시죠!
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              디자인이 너무 잘 나왔어요
            </span>
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              투표 기간 설정 가능합니다
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              익명 & 공개 투표 선택 가능합니다
            </span>
            <span className="flex items-center gap-1.5">
              <Vote className="w-4 h-4 text-violet-400" />
              공간이 하나 비어서 아무말...
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls: Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="투표 제목 또는 설명을 검색하세요..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Filter & Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setStatusFilter("ongoing")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "ongoing"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                진행 중
              </button>
              <button
                onClick={() => setStatusFilter("upcoming")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "upcoming"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                예정됨
              </button>
              <button
                onClick={() => setStatusFilter("ended")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "ended"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                마감됨
              </button>
            </div>

            <button
              onClick={loadPolls}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              title="새로고침"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Poll List Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-6"
              />
            ))}
          </div>
        ) : filteredPolls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onSelect={(selected) => setSelectedPoll(selected)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <Filter className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">
              검색된 투표가 없습니다
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              필터 조건을 변경하거나 새로운 투표를 생성해 보세요.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
            >
              첫 투표 개설하기
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6"></footer>

      {/* Modals */}
      <CreatePollModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          loadPolls();
        }}
      />

      <PollDetailModal
        poll={selectedPoll}
        user={user}
        onClose={() => setSelectedPoll(null)}
        onVoteComplete={() => {
          loadPolls();
          // Update modal poll data
          if (selectedPoll) {
            PollService.fetchPolls().then((updatedList) => {
              const updated = updatedList.find((p) => p.id === selectedPoll.id);
              if (updated) setSelectedPoll(updated);
            });
          }
        }}
      />

      <SupabaseInfoModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
    </div>
  );
}

export default App;
