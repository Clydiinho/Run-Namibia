import React from 'react';
import { X, Sparkles, Lightbulb, Code2, Palette, Gamepad2, ArrowRight } from 'lucide-react';

interface AiStoryModalProps {
  onClose: () => void;
}

export const AiStoryModal: React.FC<AiStoryModalProps> = ({ onClose }) => {
  const steps = [
    {
      icon: Lightbulb,
      title: '1. The Idea',
      desc: 'Endless runner inspired by Namibia: red Sossusvlei dunes, camelthorn acacias, desert meerkats, and shining diamonds.',
      badge: 'Creativity',
      badgeColor: 'text-amber-400 bg-amber-400/10',
    },
    {
      icon: Palette,
      title: '2. The Design',
      desc: 'Stylized 3D perspective with horizon projection, dynamic lighting, color-coded collectibles, and authentic cultural touches.',
      badge: 'Visuals',
      badgeColor: 'text-orange-400 bg-orange-400/10',
    },
    {
      icon: Code2,
      title: '3. AI Engine & Code',
      desc: 'Full physics engine, lane kinematics, Web Audio synthesizer (zero audio files needed), and 60fps canvas rendering.',
      badge: 'Engineering',
      badgeColor: 'text-cyan-400 bg-cyan-400/10',
    },
    {
      icon: Gamepad2,
      title: '4. Playable Game',
      desc: 'Instant play on phones, tablets, and laptops. Touch swipes, keyboard controls, and progressive difficulty.',
      badge: 'Finished Product',
      badgeColor: 'text-emerald-400 bg-emerald-400/10',
    },
  ];

  return (
    <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Live Demo Presentation</span>
        </div>

        <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 font-display">
          From Concept to Code in Minutes
        </h3>

        <p className="text-neutral-300 text-sm mb-6">
          &ldquo;AI isn&rsquo;t only something you ask questions to. You can use it to <strong>CREATE</strong> things.&rdquo;
        </p>

        {/* Transformation Pipeline */}
        <div className="space-y-3 mb-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-neutral-800/70 border border-neutral-700/60 rounded-2xl p-3.5 flex items-start gap-3.5"
              >
                <div className="p-2.5 rounded-xl bg-neutral-700/50 text-white shrink-0 mt-0.5">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-white">{step.title}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Presenter Takeaway */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 text-center mb-6">
          <p className="text-amber-200 text-sm font-semibold">
            &ldquo;You gave me the idea a few minutes ago. Now let&rsquo;s play it!&rdquo;
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-neutral-950 font-bold text-base shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>BACK TO THE GAME</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
