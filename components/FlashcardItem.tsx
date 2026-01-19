
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

  // Effetto reset per sicurezza, anche se l'uso della key nel padre è preferibile
  useEffect(() => {
    setFlipped(false);
  }, [card.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFlipped(prev => !prev);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-8 px-2 md:px-0 animate-fadeIn">
      <div 
        className="h-[400px] md:h-[520px] perspective select-none"
        role="button"
        tabIndex={0}
        aria-label={`Flashcard: ${card.question}. Premere spazio o invio per girare.`}
        aria-expanded={flipped}
        onKeyDown={handleKeyDown}
      >
        <div 
          className={`relative w-full h-full transition-transform duration-[800ms] preserve-3d cursor-pointer ${flipped ? 'rotate-y-180' : ''}`}
          style={{ transformStyle: 'preserve-3d', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
          onClick={() => setFlipped(prev => !prev)}
        >
          {/* Front Side */}
          <div 
            className="absolute inset-0 backface-hidden bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-[#f4f7ed] flex flex-col p-6 md:p-12 items-center justify-center text-center"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="absolute top-6 md:top-10 left-0 right-0 px-6 md:px-12 flex justify-between items-center">
              <span className="text-[9px] md:text-[10px] font-black text-[#5c871c] uppercase tracking-widest">{card.subject}</span>
              <span className="text-[8px] md:text-[9px] font-black px-2 py-1 rounded-full bg-gray-50 text-gray-400 uppercase border border-gray-100">{card.difficulty}</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-8">
              <h3 className="text-xl md:text-3xl font-black text-gray-800 leading-tight tracking-tight">{card.question}</h3>
              <div className="px-4 py-2 md:px-7 md:py-3 bg-[#f4f7ed] rounded-xl md:rounded-2xl border border-[#5c871c]/10">
                <span className="text-[9px] md:text-[11px] font-black text-[#5c871c] uppercase tracking-widest">{card.concept}</span>
              </div>
            </div>

            <div className="mt-auto flex flex-col items-center gap-2 opacity-30">
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Tocca per Girare</p>
            </div>
          </div>

          {/* Back Side */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 bg-[#5c871c] rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col p-6 md:p-12 items-start text-white overflow-hidden"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
             <div className="absolute top-6 md:top-10 left-6 md:left-12 flex items-center gap-2 opacity-60">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest">Risposta</h4>
             </div>
            
            <div className="mt-10 md:mt-12 w-full overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-4 md:space-y-8">
              <p className="text-sm md:text-lg font-medium leading-relaxed text-left whitespace-pre-wrap">
                {card.answer}
              </p>
              
              {card.explanation && (
                <div className="bg-white/10 p-5 md:p-7 rounded-[1.5rem] md:rounded-[2.25rem] border border-white/20">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">🐾 Todo.AI Focus</p>
                  <p className="text-xs md:text-[15px] italic font-medium leading-relaxed">{card.explanation}</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/15 w-full text-center">
               <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Gira per tornare alla domanda</p>
            </div>
          </div>
        </div>
      </div>

      {flipped && showGrades && (
        <div className="grid grid-cols-2 gap-3 md:gap-5 animate-fadeIn">
            <button 
              onClick={(e) => { e.stopPropagation(); onGrade(false); }}
              className="py-4 md:py-6 bg-white border-2 border-red-50 text-red-500 hover:bg-red-50 rounded-[1.5rem] md:rounded-[2rem] font-black transition-all shadow-sm flex flex-col items-center"
            >
              <span className="text-[10px] uppercase tracking-widest">Ancora Dubbi</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onGrade(true); }}
              className="py-4 md:py-6 bg-[#5c871c] text-white rounded-[1.5rem] md:rounded-[2rem] font-black transition-all shadow-xl flex flex-col items-center"
            >
              <span className="text-[10px] uppercase tracking-widest">Acquisita</span>
            </button>
        </div>
      )}
    </div>
  );
};
