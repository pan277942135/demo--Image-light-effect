import React from "react";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Github,
  Cpu,
  Waves,
} from "lucide-react";

interface TopBarProps {
  isMuted: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isHudVisible: boolean;
  onToggleHud: () => void;
  rendererType: string;
  fps: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  isMuted,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  isHudVisible,
  onToggleHud,
  rendererType,
  fps,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-4 flex items-center justify-between gap-3">
      {/* Brand & Repo Info */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-neutral-900/80 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full shadow-lg text-white">
        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
          <Waves className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="font-semibold text-xs tracking-wide text-neutral-100 flex items-center gap-1.5">
            water-caustics
          </span>
          <span className="text-[10px] text-cyan-300/80 hidden md:inline">
            Overhead-sun light overlay
          </span>
        </div>

        {/* Renderer & FPS Badge */}
        <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
              rendererType === "webgl"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : rendererType === "canvas2d"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}
          >
            <Cpu className="w-2.5 h-2.5" />
            {rendererType || "webgl"}
          </span>
          <span className="text-neutral-400 text-[10px] hidden sm:inline">
            {fps} FPS
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-md border border-white/10 p-1 rounded-full shadow-lg text-white">
        {/* Toggle Sound */}
        <button
          type="button"
          onClick={onToggleSound}
          title={isMuted ? "Unmute underwater sound" : "Mute audio"}
          className={`p-2 rounded-full transition-all text-xs flex items-center gap-1.5 ${
            !isMuted
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
              : "text-neutral-400 hover:text-white hover:bg-white/10"
          }`}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4 text-cyan-300 animate-pulse" />
          )}
        </button>

        {/* Toggle HUD */}
        <button
          type="button"
          onClick={onToggleHud}
          title={isHudVisible ? "Hide controls (Press H)" : "Show controls (Press H)"}
          className={`p-2 rounded-full transition-all text-xs flex items-center gap-1.5 ${
            !isHudVisible
              ? "bg-white/20 text-white"
              : "text-neutral-400 hover:text-white hover:bg-white/10"
          }`}
        >
          {isHudVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          className="p-2 rounded-full transition-all text-neutral-400 hover:text-white hover:bg-white/10"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* GitHub Source Link */}
        <a
          href="https://github.com/ethanfox/water-caustics"
          target="_blank"
          rel="noopener noreferrer"
          title="View ethanfox/water-caustics on GitHub"
          className="p-2 rounded-full transition-all text-neutral-400 hover:text-white hover:bg-white/10 flex items-center gap-1"
        >
          <Github className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
};
