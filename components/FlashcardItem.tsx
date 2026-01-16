
import React, { useState, useRef, useEffect } from 'react';
import { Flashcard } from '../types';

interface FlashcardItemProps {
  card: Flashcard;
  onGrade: (correct: boolean) => void;
  showGrades?: boolean;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({ card, onGrade, showGrades = true }) => {
  const [flipped, setFlipped] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    setFlipped(false);
  }, [card.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;
    if (Math.abs(diff) > 40) {
      setFlipped(prev => !prev);
    }
    touchStart.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFlipped(prev => !prev);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 md:space-y-8 px-2 md:px-0">
      <div 
        className="h-[400px] md:h-[520px] perspective select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        aria-label={`Flashcard: ${card.question}. Premere spazio o invio per girare.`}
        aria-expanded={flipped}
        onKeyDown={handleKeyDown}
      >
        <div 
          className={`relative w-full h-full duration-700 transition-all preserve-3d cursor-pointer ${flipped ? 'rotate-y-180' : ''}`}
          onClick={() => setFlipped(prev => !prev)}
        >
          {/* Front Side */}
          <div 
            className="absolute inset-0 backface-hidden bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-emerald-50/50 flex flex-col p-6 md:p-12 items-center justify-center text-center"
            aria-hidden={flipped}
          >
            <div className="absolute top-6 md:top-10 left-0 right-0 px-6 md:px-12 flex justify-between items-center">
              <span className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">{card.subject}</span>
              <span className="text-[8px] md:text-[9px] font-black px-2 py-1 rounded-full bg-gray-50 text-gray-400 uppercase border border-gray-100">{card.difficulty}</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-8">
              <h3 className="text-xl md:text-3xl font-black text-gray-800 leading-tight tracking-tight">{card.question}</h3>
              <div className="px-4 py-2 md:px-7 md:py-3 bg-emerald-50/50 rounded-xl md:rounded-2xl border border-emerald-100/50">
                <span className="text-[9px] md:text-[11px] font-black text-emerald-700 uppercase tracking-widest">{card.concept}</span>
              </div>
            </div>

            <div className="mt-auto flex flex-col items-center gap-2 opacity-30">
              <div className="w-8 md:w-10 h-1 bg-emerald-200 rounded-full"></div>
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Tocca per girare</p>
            </div>
          </div>

          {/* Back Side */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 bg-emerald-600 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col p-6 md:p-12 items-start text-white overflow-hidden"
            aria-hidden={!flipped}
          >
             <div className="absolute top-6 md:top-10 left-6 md:left-12 flex items-center gap-2 opacity-60">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white animate-pulse"></div>
                <h4 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Risposta</h4>
             </div>
            
            <div className="mt-10 md:mt-12 w-full overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-4 md:space-y-8 scroll-smooth">
              <p className="text-sm md:text-lg font-medium leading-relaxed text-left whitespace-pre-wrap">
                {card.answer}
              </p>
              
              {card.explanation && (
                <div className="bg-white/10 p-4 md:p-7 rounded-[1.5rem] md:rounded-[2.25rem] border border-white/20">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">🐾 Spiegazione di Todo.AI</p>
                  <p className="text-xs md:text-[15px] italic font-medium leading-relaxed">{card.explanation}</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/15 w-full text-center">
               <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Tocca per la domanda</p>
            </div>
          </div>
        </div>
      </div>

      {flipped && showGrades && (
        <div className="flex flex-col gap-4 md:gap-8 animate-fadeIn">
          <div className="grid grid-cols-2 gap-3 md:gap-5">
            <button 
              onClick={(e) => { e.stopPropagation(); onGrade(false); }}
              className="py-4 md:py-6 bg-white border-2 border-red-50 text-red-500 hover:bg-red-50 rounded-[1.5rem] md:rounded-[2rem] font-black transition-all active:scale-95 flex flex-col items-center gap-1 shadow-sm"
            >
              <span className="text-lg">✕</span>
              <span className="text-[8px] md:text-[10px] uppercase tracking-widest">Ancora Dubbi</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onGrade(true); }}
              className="py-4 md:py-6 bg-emerald-600 text-white rounded-[1.5rem] md:rounded-[2rem] font-black transition-all shadow-xl active:scale-95 flex flex-col items-center gap-1"
            >
              <span className="text-lg">✓</span>
              <span className="text-[8px] md:text-[10px] uppercase tracking-widest">Acquisita</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
