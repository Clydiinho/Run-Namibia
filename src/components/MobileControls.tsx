import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

interface MobileControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onJump,
}) => {
  return (
    <div className="absolute inset-x-0 bottom-4 pointer-events-none px-4 flex justify-between items-end z-20 select-none">
      {/* Left & Right Steering cluster */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onMoveLeft();
          }}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-neutral-900/85 backdrop-blur-md border-2 border-neutral-700/80 active:scale-95 active:bg-amber-500/30 active:border-amber-400 flex items-center justify-center text-white shadow-xl transition-transform"
          aria-label="Move Left"
        >
          <ArrowLeft className="w-8 h-8 text-neutral-200" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onMoveRight();
          }}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-neutral-900/85 backdrop-blur-md border-2 border-neutral-700/80 active:scale-95 active:bg-amber-500/30 active:border-amber-400 flex items-center justify-center text-white shadow-xl transition-transform"
          aria-label="Move Right"
        >
          <ArrowRight className="w-8 h-8 text-neutral-200" />
        </button>
      </div>

      {/* Jump Button */}
      <div className="pointer-events-auto">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onJump();
          }}
          className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 border-2 border-amber-300 active:scale-95 active:from-amber-700 active:to-orange-600 flex flex-col items-center justify-center text-white shadow-2xl transition-transform"
          aria-label="Jump"
        >
          <ArrowUp className="w-8 h-8 stroke-[3]" />
          <span className="text-[11px] font-black uppercase tracking-wider mt-0.5">Jump</span>
        </button>
      </div>
    </div>
  );
};
