import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, X, Music, ExternalLink, Volume2, VolumeX } from 'lucide-react';

export interface PlaylistItem {
  id: string;
  title: string;
  linkUrl: string;
  videoId: string;
}

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

interface YouTubePlaylistPlayerProps {
  items: PlaylistItem[];
  initialIndex?: number;
  onClose: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlaylistPlayer: React.FC<YouTubePlaylistPlayerProps> = ({
  items,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const playerRef = useRef<any>(null);
  const containerIdRef = useRef<string>(`yt-player-${Math.random().toString(36).substr(2, 9)}`);

  const currentItem = items[currentIndex];

  useEffect(() => {
    // Load YouTube iFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      if (window.YT && window.YT.Player && currentItem) {
        playerRef.current = new window.YT.Player(containerIdRef.current, {
          height: '180',
          width: '100%',
          videoId: currentItem.videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              event.target.playVideo();
              setIsPlaying(true);
            },
            onStateChange: (event: any) => {
              // YT.PlayerState.ENDED is 0
              if (event.data === 0) {
                handleNext();
              } else if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              }
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/30 shadow-2xl animate-fade-in relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-rose-400" />
            연속 재생 플레이어 ({currentIndex + 1} / {items.length}곡)
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="플레이어 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Embedded YouTube Iframe Container */}
      <div className="rounded-xl overflow-hidden mb-3 bg-black/80 aspect-video max-h-44 flex items-center justify-center border border-slate-800">
        <div id={containerIdRef.current} className="w-full h-full" />
      </div>

      {/* Controls & Track Information */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        {/* Track Title */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span className="text-xs font-semibold text-white truncate block">
            {currentItem.title}
          </span>
          <a
            href={currentItem.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1 mt-0.5"
          >
            <span>유튜브 웹사이트에서 보기</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Playback Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-200 hover:text-white transition-all active:scale-95"
            title="이전 곡"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={handleNext}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-200 hover:text-white transition-all active:scale-95"
            title="다음 곡 (자동 연속)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-white transition-all active:scale-95"
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
