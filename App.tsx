
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppView, Flashcard, MultipleChoiceQuestion, TestResult, Year, ABIVET_SUBJECTS, StudyReminder, Badge, SUBJECT_ICONS, DETAILED_SUBJECTS } from './types';
import { ICONS } from './constants';
import { FlashcardItem } from './components/FlashcardItem';
import { StudyCalendar } from './components/StudyCalendar';
import { generateFlashcards, generateQuizQuestions, generateBalancedExam } from './services/geminiService';

const TODO_QUOTES = [
  "Ho fiutato un 30 lode in Anatomia oggi! 🐾",
  "Pronta a sbranare i libri? 🦴",
  "Sveglia come un Jack Russell alle 6 del mattino! 🐶",
  "Un vero levriero dello studio! 🏎️",
  "Oggi la Farmacologia non ha scampo! Woof! 💊",
  "Corriamo verso il diploma! 🎓",
  "Zootecnia? Un gioco da ragazzi per noi! 🐄",
  "Karma dice che oggi sarai super produttiva! 🐈",
  "Procedura infermieristica? Todo approva il tuo metodo! 💉"
];

const LOADING_MESSAGES = [
  "Todo sta fiutando nuovi termini tecnici...",
  "Analisi dei vetrini in corso (Karma help!)...",
  "Teo sta mettendo in ordine i protocolli clinici...",
  "Bau! Quasi pronti con il referto AI!",
  "Sincronizzando i microchip della memoria...",
  "Consultando l'archivio clinico Abivet...",
  "Preparando i reagenti per il test di laboratorio..."
];

const AI_FEEDBACK_TITLES = ["🐾 Verdetto Todo", "🧪 Angolo Teo", "🐈 Appunti Karma", "🩺 Protocollo Todo"];

const STORAGE_KEYS = {
  CARDS: 'ab_v21_cards', QUIZ: 'ab_v21_quiz', HISTORY: 'ab_v21_history', BADGES: 'ab_v21_badges', REMINDERS: 'ab_v21_rem'
};

const themeClasses = {
  bg: 'bg-[#5c871c]',
  text: 'text-[#5c871c]',
  border: 'border-[#5c871c]',
  light: 'bg-[#f4f7ed]',
  ring: 'ring-[#5c871c]/20'
};

const App: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.CARDS) || '[]'));
  const [quizDB, setQuizDB] = useState<MultipleChoiceQuestion[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZ) || '[]'));
  const [history, setHistory] = useState<TestResult[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]'));
  const [badges, setBadges] = useState<Badge[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]'));
  const [reminders, setReminders] = useState<StudyReminder[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS) || '[]'));

  const [view, setView] = useState<AppView>('dashboard');
  const [showGeneralTestModal, setShowGeneralTestModal] = useState<null | '1' | 'F'>(null);
  const [currentQuote, setCurrentQuote] = useState(TODO_QUOTES[0]);
  const [selectedLabSubject, setSelectedLabSubject] = useState<string>(ABIVET_SUBJECTS[Year.First][0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [loadMsg, setLoadMsg] = useState("");

  const [currentSessionCards, setCurrentSessionCards] = useState<Flashcard[]>([]);
  const [currentSessionQuiz, setCurrentSessionQuiz] = useState<MultipleChoiceQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userSelections, setUserSelections] = useState<Record<number, number>>({});
  const [activeSubject, setActiveSubject] = useState<string>('Tutto');
  const [lastSessionResult, setLastSessionResult] = useState<TestResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToTop();
  }, [view, currentIdx, scrollToTop]);

  const refreshQuote = useCallback(() => {
    const newQuote = TODO_QUOTES[Math.floor(Math.random() * TODO_QUOTES.length)];
    setCurrentQuote(newQuote);
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.QUIZ, JSON.stringify(quizDB)); }, [quizDB]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges)); }, [badges]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders)); }, [reminders]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleCompleteQuiz();
      return;
    }
    const timer = setInterval(() => setTimeLeft(p => (p !== null ? p - 1 : null)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const subj1 = ABIVET_SUBJECTS[Year.First];
  const subj2 = ABIVET_SUBJECTS[Year.Second];
  const allSubj = [...subj1, ...subj2];
  const badges1 = useMemo(() => badges.filter(b => subj1.includes(b.subject)), [badges, subj1]);
  const badges2 = useMemo(() => badges.filter(b => subj2.includes(b.subject)), [badges, subj2]);
  
  const totalAccuracy = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round(history.reduce((a, b) => a + (b.accuracy || 0), 0) / history.length);
  }, [history]);

  const exam1Passed = history.some(h => h.subject === "Esame Primo Anno" && h.accuracy >= 60);
  const examFinalPassed = history.some(h => h.subject === "Esame Finale" && h.accuracy >= 60);
  const isFinalUnlocked = badges1.length === subj1.length && badges2.length === subj2.length && exam1Passed;

  const todoAdvice = useMemo(() => {
    const valid = history.filter(h => h.type === 'Quiz' && h.subject !== 'Tutto');
    const uniqueModulesTested = new Set(valid.map(h => h.subject));
    if (uniqueModulesTested.size < 3) return { locked: true, progress: uniqueModulesTested.size };
    const stats: Record<string, {acc: number, count: number}> = {};
    valid.forEach(h => {
      if (!stats[h.subject]) stats[h.subject] = { acc: 0, count: 0 };
      stats[h.subject].acc += h.accuracy;
      stats[h.subject].count++;
    });
    const sorted = Object.entries(stats).sort((a,b) => (a[1].acc/a[1].count) - (b[1].acc/b[1].count));
    const worst = sorted[0];
    return { 
      locked: false, 
      subject: worst[0], 
      accuracy: Math.round(worst[1].acc / worst[1].count), 
      isFailed: (worst[1].acc/worst[1].count) < 60 
    };
  }, [history]);

  const handleCompleteQuiz = useCallback(() => {
    let correct = 0; let wrong = 0; let unanswered = 0;
    const isExam = activeSubject.startsWith('Esame');
    currentSessionQuiz.forEach((q, i) => {
      const sel = userSelections[i];
      if (sel === q.correctIndex) correct++;
      else if (sel === undefined || sel === -1) unanswered++;
      else wrong++;
    });
    let finalAccuracy = 0; let points = 0;
    if (isExam) {
      points = (correct * 2) - (wrong * 0.5) - (unanswered * 0.25);
      finalAccuracy = (points / (currentSessionQuiz.length * 2)) * 100;
      if (finalAccuracy < 0) finalAccuracy = 0;
    } else {
      finalAccuracy = (correct / currentSessionQuiz.length) * 100;
    }
    const res: TestResult = { 
      id: Math.random().toString(36).substr(2, 9), date: Date.now(), subject: activeSubject, 
      type: isExam ? (activeSubject as any) : 'Quiz', totalCards: currentSessionQuiz.length, 
      correctAnswers: correct, accuracy: finalAccuracy, points: points,
      details: currentSessionQuiz.map((q, i) => ({ q, selected: userSelections[i] }))
    };
    setHistory(prev => [res, ...prev]);
    setLastSessionResult(res);
    setTimeLeft(null);
    if (!isExam && activeSubject !== 'Tutto' && finalAccuracy >= 80) {
      if (!badges.some(b => b.subject === activeSubject)) {
        setBadges(prev => [...prev, { id: Math.random().toString(), subject: activeSubject, icon: SUBJECT_ICONS[activeSubject] || '🏅', earnedDate: Date.now() }]);
      }
    }
    setView('review');
  }, [activeSubject, currentSessionQuiz, userSelections, badges]);

  const startQuizSession = async (s: string, type: 'Normal' | '1' | 'F' = 'Normal') => {
    let pool: MultipleChoiceQuestion[] = [];
    let count = 10;
    let time = null;

    if (type === '1') { count = 50; time = 30 * 60; } 
    else if (type === 'F') { count = 100; time = 60 * 60; }

    if (type === '1' || type === 'F') {
      setIsGenerating(true); setGenProgress(0);
      setLoadMsg(`Todo sta preparando il protocollo d'esame...`);
      const timer = setInterval(() => {
        setGenProgress(p => p < 98 ? p + 1 : p);
        if (Math.random() > 0.8) setLoadMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 700);
      try {
        pool = await generateBalancedExam(type as any, count);
        clearInterval(timer); setGenProgress(100);
      } catch (e: any) { 
        clearInterval(timer); 
        setIsGenerating(false); 
        console.error("Gemini error:", e);
        alert(e?.message || "Errore AI. Verifica la chiave API nelle impostazioni."); 
        return;
      }
      setIsGenerating(false);
    } else {
      pool = s === 'Tutto' ? quizDB : quizDB.filter(q => q.subject === s);
      if (pool.length === 0) return alert("Genera prima i quiz nel Laboratorio AI!");
      pool = pool.sort(() => Math.random() - 0.5).slice(0, 10);
    }
    
    setCurrentSessionQuiz(pool);
    setCurrentIdx(0); setUserSelections({}); setTimeLeft(time);
    setActiveSubject(type === '1' ? 'Esame Primo Anno' : type === 'F' ? 'Esame Finale' : s); 
    setView('quiz_session');
  };

  const startFlashcardSession = (s: string) => {
    let pool = s === 'Tutto' ? cards : cards.filter(c => c.subject === s);
    if (pool.length === 0) return alert("Genera prima le flashcard nel Laboratorio AI!");
    setCurrentSessionCards(pool.sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setActiveSubject(s);
    setCorrectCount(0);
    setView('session');
  };

  const handleGradeFlashcard = (isCorrect: boolean) => {
    const nextCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    setCorrectCount(nextCorrectCount);
    
    if (currentIdx < currentSessionCards.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      const res: TestResult = { 
        id: Math.random().toString(36).substr(2, 9), date: Date.now(), subject: activeSubject, 
        type: 'Flashcard', totalCards: currentSessionCards.length, 
        correctAnswers: nextCorrectCount, accuracy: (nextCorrectCount / currentSessionCards.length) * 100
      };
      setHistory(prev => [res, ...prev]);
      setLastSessionResult(res);
      setView('review');
    }
  };

  const generateLaboratoryItems = async (subject: string) => {
    if (isGenerating) return;
    setIsGenerating(true); setGenProgress(0); setLoadMsg(LOADING_MESSAGES[0]);
    const timer = setInterval(() => { 
      setGenProgress(p => p < 95 ? p + 2 : p);
      if (Math.random() > 0.7) setLoadMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 1200);

    const historyQuestions = history
      .flatMap(h => h.details || [])
      .map(detail => detail.q?.question)
      .filter(Boolean);

    const currentCards = cards.filter(c => c.subject === subject).map(c => c.question);
    const currentQuizzes = quizDB.filter(q => q.subject === subject).map(q => q.question);

    const allExcluded = Array.from(new Set([...historyQuestions, ...currentCards, ...currentQuizzes])).slice(-80);

    try {
      const year = ABIVET_SUBJECTS[Year.First].includes(subject) ? Year.First : Year.Second;
      const [newCards, newQuiz] = await Promise.all([
        generateFlashcards(subject, year, allExcluded, 10),
        generateQuizQuestions(subject, year, allExcluded, 10)
      ]);
      setCards(prev => [...prev.filter(c => c.subject !== subject), ...newCards]);
      setQuizDB(prev => [...prev.filter(q => q.subject !== subject), ...newQuiz]);
      clearInterval(timer); setGenProgress(100); setTimeout(() => setIsGenerating(false), 800);
    } catch (e: any) { 
      clearInterval(timer); 
      setIsGenerating(false); 
      console.error("Gemini error:", e);
      alert(e?.message || "Errore AI. Verifica la chiave API nelle impostazioni."); 
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col md:flex-row pb-24 md:pb-0 font-['Inter']">
      {/* Sidebar Sidebar Desktop */}
      <aside className="w-80 bg-white border-r border-gray-100 hidden md:flex flex-col fixed inset-y-0 z-30 shadow-sm">
        <div className="p-10 border-b border-gray-50 text-center">
          <div onClick={refreshQuote} className={`w-20 h-20 mx-auto ${themeClasses.bg} rounded-[2.5rem] flex items-center justify-center text-white text-4xl shadow-2xl mb-4 cursor-pointer hover:rotate-12 transition-all active:scale-95`}>🐶</div>
          <h1 className="text-2xl font-black italic">ABIVET<span className={themeClasses.text}>.PRO</span></h1>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'dashboard', icon: <ICONS.Dashboard />, label: 'Dashboard' },
            { id: 'study', icon: <ICONS.Study />, label: 'Libreria' },
            { id: 'badges', icon: <ICONS.Badges />, label: 'Badge' },
            { id: 'calendar', icon: <ICONS.Calendar />, label: 'Agenda' },
            { id: 'history', icon: <ICONS.History />, label: 'Registro' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setView(item.id as AppView)} 
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${view === item.id ? themeClasses.bg + ' text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 md:ml-80 p-4 md:p-12 overflow-y-auto max-h-screen custom-scrollbar">
        {view === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn pb-12">
            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
               <div onClick={refreshQuote} className={`w-28 h-28 md:w-32 md:h-32 ${themeClasses.bg} rounded-[2.5rem] flex items-center justify-center text-5xl md:text-6xl shadow-2xl cursor-pointer transition-all hover:scale-110 active:rotate-12`}>🐶</div>
               <div onClick={refreshQuote} className="flex-1 text-center md:text-left space-y-3 z-10 cursor-pointer">
                  <h2 className="text-3xl md:text-4xl font-black italic text-gray-800">Bentornata Alice! 🐾</h2>
                  <div className={`${themeClasses.light} p-5 rounded-2xl border ${themeClasses.border} border-opacity-10 shadow-inner`}><p className={`${themeClasses.text} font-bold italic text-lg leading-relaxed`}>"{currentQuote}"</p></div>
                  <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Precisione Media:</span>
                     <div className="bg-gray-100 rounded-full h-3 w-32 overflow-hidden shadow-inner"><div className={`${themeClasses.bg} h-full transition-all duration-1000 shadow-[0_0_10px_#5c871c]`} style={{width: `${totalAccuracy}%`}}></div></div>
                     <span className={`text-sm font-black ${totalAccuracy >= 60 ? themeClasses.text : 'text-rose-500'}`}>{totalAccuracy}%</span>
                  </div>
               </div>
            </div>

            {/* Il Fiuto di Todo */}
            <section className="p-1 rounded-[4rem] bg-gradient-to-br from-[#5c871c] via-[#86b533] to-[#a2d149] shadow-2xl overflow-hidden">
               <div className="bg-white m-1 p-8 md:p-14 rounded-[3.8rem] space-y-8 relative">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gray-900 flex items-center justify-center text-3xl md:text-4xl shadow-xl hover:rotate-6 transition-transform">🕵️‍♂️🦴</div>
                     <div><h3 className="text-2xl md:text-3xl font-black italic">Il Fiuto di Todo</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unità Investigativa Clinica</p></div>
                  </div>
                  {!todoAdvice.locked ? (
                    <div className={`p-8 md:p-10 rounded-[3rem] border-4 flex flex-col md:flex-row items-center gap-10 transition-all ${todoAdvice.isFailed ? 'bg-rose-50 border-rose-300' : themeClasses.light + ' ' + themeClasses.border}`}>
                       <div className="text-7xl md:text-8xl drop-shadow-2xl animate-pulse">{todoAdvice.isFailed ? '🩹🐈' : '🩺🐕'}</div>
                       <div className="flex-1 space-y-3">
                          <p className={`text-xl md:text-2xl font-black ${todoAdvice.isFailed ? 'text-rose-900' : 'text-[#5c871c]'}`}>Criticità: {todoAdvice.subject}</p>
                          <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-gray-500"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Media Recente: {todoAdvice.accuracy}%</p>
                          <p className="italic font-medium text-lg text-gray-600">"Alice, ripassiamo questo modulo insieme per evitare sviste cliniche!"</p>
                       </div>
                       <button onClick={() => startQuizSession(todoAdvice.subject!)} className="w-full md:w-auto px-12 py-6 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95">RIPETI QUIZ 🦴</button>
                    </div>
                  ) : (
                    <div className="p-10 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-center space-y-4">
                       <p className="text-lg font-bold text-gray-500 italic">"Completa quiz in almeno 3 moduli per attivare il mio fiuto investigativo! ({todoAdvice.progress}/3)"</p>
                    </div>
                  )}
               </div>
            </section>

            {/* Laboratorio Analisi AI */}
            <section className="bg-gradient-to-br from-slate-900 via-gray-950 to-slate-900 p-8 md:p-14 rounded-[4.5rem] text-white space-y-10 relative overflow-hidden border-t-8 border-[#5c871c] shadow-2xl">
               <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
               <div className="flex items-center gap-5 relative z-10">
                  <div className="w-4 h-4 bg-[#5c871c] rounded-full animate-ping"></div>
                  <div><h3 className="text-3xl md:text-4xl font-black italic tracking-tighter">🧪 Laboratorio Analisi AI</h3><p className="text-[10px] font-black text-[#5c871c] uppercase tracking-[0.5em]">Standard Abivet Clinical Protocol</p></div>
               </div>
               <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                  <div className="flex-1 relative group">
                    <select value={selectedLabSubject} onChange={(e) => setSelectedLabSubject(e.target.value)} className="w-full bg-white/5 border-2 border-white/10 p-7 rounded-[2.5rem] font-bold text-lg outline-none backdrop-blur-md focus:border-[#5c871c] transition-all hover:bg-white/10 cursor-pointer shadow-inner appearance-none relative z-10">
                      {allSubj.map(s => <option key={s} value={s} className="bg-gray-950 text-white">{s}</option>)}
                    </select>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-[#5c871c] text-xl z-20 group-hover:scale-125 transition-transform">▼</div>
                  </div>
                  <button disabled={isGenerating} onClick={() => generateLaboratoryItems(selectedLabSubject)} className={`px-16 py-7 rounded-[2.5rem] font-black uppercase tracking-widest shadow-[0_0_40px_rgba(92,135,28,0.4)] transition-all active:scale-95 ${isGenerating ? 'bg-gray-800 text-gray-500' : 'bg-[#5c871c] text-white hover:bg-[#6fab1c]'}`}>
                    {isGenerating ? "ANALISI..." : "GENERA 🦴"}
                  </button>
               </div>
               {isGenerating && (
                 <div className="space-y-6 animate-fadeIn relative z-10">
                    <div className="flex justify-between text-[11px] font-black text-[#5c871c] uppercase tracking-widest italic animate-pulse"><span>{loadMsg}</span> <span>{genProgress}%</span></div>
                    <div className="h-5 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5 shadow-inner"><div className="h-full bg-[#5c871c] rounded-full transition-all duration-300 shadow-[0_0_20px_#5c871c]" style={{width: `${genProgress}%`}}></div></div>
                 </div>
               )}
            </section>

            {/* Missione Osso d'Oro */}
            <div className="bg-white p-8 md:p-16 rounded-[4.5rem] border border-gray-100 shadow-sm space-y-12">
               <h3 className="text-4xl md:text-5xl font-black italic tracking-tighter text-gray-900 text-center md:text-left">Missione Osso d'Oro 🦴</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className={`p-8 md:p-10 rounded-[3.5rem] border-4 flex flex-col gap-8 transition-all hover:scale-[1.03] relative overflow-hidden group shadow-lg ${badges1.length === subj1.length ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-100' : 'border-gray-50 bg-gray-50 opacity-60'}`}>
                    <span className="text-6xl drop-shadow-lg">🥇</span>
                    <h4 className="text-2xl font-black italic text-amber-900 leading-none">Esame 1° Anno</h4>
                    <div className="space-y-2 relative z-10">
                       <div className="flex justify-between text-[10px] font-black text-amber-800 uppercase tracking-widest"><span>Badge Moduli</span> <span>{badges1.length}/{subj1.length}</span></div>
                       <div className="h-4 bg-white/50 rounded-full overflow-hidden shadow-inner border border-amber-200/50"><div className="h-full bg-amber-500 transition-all duration-1000" style={{width: `${(badges1.length/subj1.length)*100}%`}}></div></div>
                    </div>
                    <button disabled={isGenerating} onClick={() => setShowGeneralTestModal('1')} className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase shadow-xl transition-all relative z-10 ${exam1Passed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>{exam1Passed ? "COMPLETATO ✅" : "AVVIA (50 Q.)"}</button>
                  </div>

                  <div className={`p-8 md:p-10 rounded-[3.5rem] border-4 flex flex-col gap-8 transition-all hover:scale-[1.03] relative overflow-hidden group shadow-lg ${badges2.length === subj2.length ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-100' : 'border-gray-50 bg-gray-50 opacity-60'}`}>
                    <span className="text-6xl drop-shadow-lg">🥈</span>
                    <h4 className="text-2xl font-black italic text-blue-900 leading-none">Esame Finale</h4>
                    <div className="space-y-2 relative z-10">
                       <div className="flex justify-between text-[10px] font-black text-blue-800 uppercase tracking-widest"><span>Badge Moduli</span> <span>{badges2.length}/{subj2.length}</span></div>
                       <div className="h-4 bg-white/50 rounded-full overflow-hidden shadow-inner border border-blue-200/50"><div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${(badges2.length/subj2.length)*100}%`}}></div></div>
                    </div>
                    <button disabled={isGenerating} onClick={() => setShowGeneralTestModal('F')} className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase shadow-xl transition-all relative z-10 ${examFinalPassed ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{examFinalPassed ? "COMPLETATO ✅" : "AVVIA (100 Q.)"}</button>
                  </div>

                  <div className={`p-8 md:p-10 rounded-[3.5rem] border-4 flex flex-col items-center text-center gap-8 transition-all hover:scale-[1.03] relative overflow-hidden group shadow-lg ${isFinalUnlocked ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-100' : 'border-gray-50 bg-gray-50 opacity-60'}`}>
                    <span className={`text-7xl drop-shadow-2xl ${isFinalUnlocked ? 'animate-bounce' : ''}`}>🏆</span>
                    <h4 className="text-2xl font-black italic text-emerald-900 h-10 flex items-center justify-center">Diploma Abivet</h4>
                    <button disabled={!isFinalUnlocked} className={`w-full py-7 rounded-[2rem] font-black text-lg uppercase shadow-2xl relative z-10 transition-all ${isFinalUnlocked ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-white'}`}>RITIRA DIPLOMA</button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'study' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn pb-24 px-2">
            {allSubj.map(s => {
              const cardsCount = cards.filter(c => c.subject === s).length;
              const quizCount = quizDB.filter(q => q.subject === s).length;
              return (
                <div key={s} className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col gap-10 hover:shadow-2xl transition-all group hover:scale-[1.02]">
                   <div className="flex justify-between items-start"><h4 className="text-2xl font-black leading-tight flex-1 italic text-gray-800">{s}</h4><span className="text-5xl group-hover:scale-110 transition-transform">{SUBJECT_ICONS[s]}</span></div>
                   <div className="grid grid-cols-2 gap-4 mt-auto">
                     <button onClick={() => startFlashcardSession(s)} className={`py-5 rounded-[1.5rem] text-[11px] font-black uppercase transition-all active:scale-95 ${cardsCount > 0 ? themeClasses.bg + ' text-white shadow-md hover:bg-[#6fab1c]' : 'bg-gray-100 text-gray-400'}`}>Cards ({cardsCount})</button>
                     <button onClick={() => startQuizSession(s)} className={`py-5 rounded-[1.5rem] text-[11px] font-black uppercase transition-all active:scale-95 ${quizCount > 0 ? 'bg-gray-900 text-white shadow-md hover:bg-black' : 'bg-gray-100 text-gray-400'}`}>Quiz ({quizCount})</button>
                   </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'badges' && (
          <div className="max-w-6xl mx-auto space-y-12 animate-fadeIn pb-20 px-2">
            <div className="text-center md:text-left space-y-4">
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-gray-800">Bacheca d'Eccellenza 🏆</h2>
              <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-200 inline-block shadow-sm">
                  <p className="text-amber-700 font-black uppercase tracking-widest text-[11px] mb-2 flex items-center gap-2">🦴 Istruzioni di Todo:</p>
                  <p className="text-amber-900 font-bold italic text-sm">"Alice, ottieni almeno l'80% in un quiz specifico di modulo per sbloccare il suo badge clinico! Ottenerli tutti è necessario per il Diploma Finale."</p>
               </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {allSubj.map(s => {
                 const b = badges.find(x => x.subject === s);
                 return (
                   <div key={s} className={`p-8 rounded-[3rem] border-2 flex flex-col items-center gap-4 transition-all relative group shadow-sm hover:shadow-xl ${b ? 'bg-white border-[#5c871c]/10 shadow-lg scale-105' : 'bg-gray-100 border-gray-100 opacity-20 grayscale'}`}>
                      <span className={`text-5xl ${b ? 'animate-pulse' : ''}`}>{SUBJECT_ICONS[s]}</span>
                      <p className="text-[9px] font-black text-center uppercase text-gray-600 tracking-tight leading-none h-6 flex items-center">{s}</p>
                      {b && <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#5c871c] text-white rounded-full flex items-center justify-center text-xs shadow-lg font-black italic">✓</div>}
                   </div>
                 );
              })}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="max-w-5xl mx-auto animate-fadeIn pb-32">
            <StudyCalendar 
              reminders={reminders} 
              history={history} 
              badges={badges} 
              onAddReminder={(r) => setReminders(p => [...p, {...r, id: Math.random().toString(36).substr(2, 9)}])} 
              onDeleteReminder={(id) => setReminders(p => p.filter(x => x.id !== id))} 
              onToggleReminder={(id) => setReminders(p => p.map(x => x.id === id ? {...x, completed: !x.completed} : x))} 
            />
          </div>
        )}

        {view === 'history' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn pb-20 px-2">
             <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-gray-800">Registro Analisi Cliniche 🩺</h2>
             <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <tr className="border-b"><th className="px-10 py-8">Data</th><th className="px-10 py-8">Modulo</th><th className="px-10 py-8 text-right">Esito</th></tr>
                   </thead>
                   <tbody className="divide-y text-xs font-bold">
                      {history.map(h => (
                        <tr key={h.id} onClick={() => { setLastSessionResult(h); setView('review'); }} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                           <td className="px-10 py-8 text-gray-400">{new Date(h.date).toLocaleDateString('it-IT')}</td>
                           <td className="px-10 py-8 font-black text-gray-900 italic">{h.subject} <span className="text-[9px] opacity-30 tracking-widest">({h.type})</span></td>
                           <td className={`px-10 py-8 text-right font-black text-2xl ${h.accuracy >= 60 ? themeClasses.text : 'text-rose-500'}`}>{Math.round(h.accuracy)}%</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {view === 'session' && currentSessionCards.length > 0 && (
          <div className="max-w-4xl mx-auto py-12 px-2 animate-fadeIn flex flex-col items-center">
            <div className="w-full mb-12 flex justify-between items-center px-4">
               <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Progresso Studio</span>
                  <div className="text-2xl font-black italic">{currentIdx + 1} / {currentSessionCards.length}</div>
               </div>
               <button onClick={() => setView('study')} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700">Interrompi</button>
            </div>
            <FlashcardItem 
              key={currentSessionCards[currentIdx].id}
              card={currentSessionCards[currentIdx]} 
              onGrade={handleGradeFlashcard} 
            />
          </div>
        )}

        {view === 'quiz_session' && currentSessionQuiz.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn py-12 px-2 pb-32">
             <div className="flex justify-between items-center">
                <div className="space-y-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{activeSubject}</span>
                   <h2 className="text-3xl font-black italic">Domanda {currentIdx + 1} / {currentSessionQuiz.length}</h2>
                </div>
                {timeLeft !== null && (
                  <div className={`p-4 rounded-2xl border-2 ${timeLeft < 300 ? 'border-rose-500 text-rose-500 animate-pulse' : 'border-gray-100 text-gray-800'} font-black flex items-center gap-3 bg-white shadow-sm`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </div>
                )}
             </div>

             <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-gray-100 shadow-sm space-y-10">
                <div className="space-y-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#5c871c] bg-[#f4f7ed] px-3 py-1 rounded-full border border-[#5c871c]/10">
                      {currentSessionQuiz[currentIdx].subject}
                   </span>
                   <p className="text-2xl md:text-3xl font-black italic text-gray-800 leading-tight pt-2">
                     {currentSessionQuiz[currentIdx].question}
                   </p>
                </div>
                
                <div className="grid gap-4">
                   {currentSessionQuiz[currentIdx].options.map((opt, i) => (
                     <button 
                       key={i} 
                       onClick={() => setUserSelections(prev => ({...prev, [currentIdx]: i}))}
                       className={`p-6 md:p-8 rounded-[2.5rem] border-2 text-left font-bold text-lg transition-all flex items-center gap-6 ${userSelections[currentIdx] === i ? 'bg-[#f4f7ed] border-[#5c871c] text-[#5c871c] shadow-lg scale-[1.02]' : 'bg-gray-50 border-gray-50 text-gray-500 hover:border-gray-200'}`}
                     >
                       <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${userSelections[currentIdx] === i ? 'bg-[#5c871c] text-white' : 'bg-white text-gray-300'}`}>
                         {String.fromCharCode(65 + i)}
                       </span>
                       {opt}
                     </button>
                   ))}
                </div>
             </div>

             <div className="flex justify-between items-center pt-8">
                <button 
                  disabled={currentIdx === 0} 
                  onClick={() => setCurrentIdx(prev => prev - 1)}
                  className="px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-sm disabled:opacity-30"
                >
                  Indietro
                </button>
                {currentIdx < currentSessionQuiz.length - 1 ? (
                  <button 
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    className="px-12 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-sm shadow-xl hover:bg-black transition-all"
                  >
                    Avanti
                  </button>
                ) : (
                  <button 
                    onClick={handleCompleteQuiz}
                    className="px-16 py-6 bg-[#5c871c] text-white rounded-3xl font-black uppercase text-lg shadow-2xl hover:bg-[#6fab1c] transition-all animate-pulse"
                  >
                    Concludi Protocollo 🐾
                  </button>
                )}
             </div>
          </div>
        )}

        {view === 'review' && lastSessionResult && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn py-12 px-2 pb-32">
             <div className="text-center space-y-6">
                <div className={`w-44 h-44 rounded-full mx-auto flex flex-col items-center justify-center font-black text-white text-5xl ${lastSessionResult.accuracy >= 60 ? themeClasses.bg : 'bg-rose-500'} shadow-2xl border-8 border-white animate-fadeIn`}>{Math.round(lastSessionResult.accuracy)}%</div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black italic">Referto Clinico 🐾</h2>
                    <p className="text-3xl font-black text-[#5c871c] italic">Corrette: {lastSessionResult.correctAnswers} / {lastSessionResult.totalCards}</p>
                </div>
                <button onClick={() => setView('dashboard')} className="px-12 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-black transition-all active:scale-95">Dashboard</button>
             </div>
             <div className="space-y-8">
                 {lastSessionResult.details?.map((item, idx) => (
                   <div key={idx} className={`p-10 rounded-[3.5rem] bg-white border-2 ${item.selected === item.q.correctIndex ? 'border-[#5c871c]/10 shadow-sm' : 'border-rose-100 shadow-xl shadow-rose-50'} space-y-8`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1"><span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Domanda {idx + 1} ({item.q.subject})</span><p className="text-2xl font-black italic text-gray-800">{item.q.question}</p></div>
                        {item.selected === item.q.correctIndex ? <span className="text-[#5c871c] text-3xl">✓</span> : <span className="text-rose-500 text-3xl">✕</span>}
                      </div>
                      <div className="space-y-3">
                         {item.q.options.map((opt: any, i: number) => (
                           <div key={i} className={`p-5 rounded-[2rem] flex items-center gap-4 font-bold border transition-colors ${i === item.q.correctIndex ? 'bg-[#f4f7ed] border-[#5c871c]/30 text-[#5c871c]' : i === item.selected ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'}`}>
                             <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === item.q.correctIndex ? themeClasses.bg + ' text-white' : i === item.selected ? 'bg-rose-600 text-white' : 'bg-white text-gray-300'}`}>{String.fromCharCode(65+i)}</span> {opt}
                           </div>
                         ))}
                      </div>
                      <div className="p-8 bg-[#f4f7ed] rounded-[2.5rem] border border-[#5c871c]/10 italic text-sm text-gray-700">
                         <p className="text-[10px] font-black uppercase tracking-widest text-[#5c871c] mb-2 flex items-center gap-2">🐶 {AI_FEEDBACK_TITLES[idx % AI_FEEDBACK_TITLES.length]}</p>
                         {item.q.explanation}
                      </div>
                   </div>
                 ))}
             </div>
          </div>
        )}
      </main>

      {/* Navigation Mobile */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/95 backdrop-blur-3xl border border-gray-100 rounded-[3rem] flex justify-around items-center p-5 z-40 shadow-2xl">
        {[
          { id: 'dashboard', icon: <ICONS.Dashboard /> },
          { id: 'study', icon: <ICONS.Study /> },
          { id: 'badges', icon: <ICONS.Badges /> },
          { id: 'calendar', icon: <ICONS.Calendar /> },
          { id: 'history', icon: <ICONS.History /> }
        ].map(item => (
          <button key={item.id} onClick={() => setView(item.id as AppView)} className={`p-3 rounded-2xl transition-all active:scale-75 ${view === item.id ? themeClasses.text + ' bg-[#f4f7ed] shadow-inner' : 'text-gray-300'}`}>{item.icon}</button>
        ))}
      </nav>

      {/* Modal Esame */}
      {showGeneralTestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 text-center space-y-10 shadow-3xl">
            <h4 className="text-4xl font-black italic tracking-tighter uppercase text-gray-900 leading-none">PRONTA ALICE? 🐾</h4>
            <div className="p-8 bg-[#f4f7ed] rounded-[2.5rem] border border-[#5c871c]/10">
                <p className="text-gray-700 font-black text-lg">{showGeneralTestModal === '1' ? 'Esame 1° Anno: 50 Q. - 30 min.' : 'Esame Finale: 100 Q. - 60 min.'}</p>
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-2 font-bold">Standard Abivet Protocol</p>
            </div>
            <div className="grid gap-4">
              <button onClick={() => { startQuizSession('Tutto', showGeneralTestModal); setShowGeneralTestModal(null); }} className={`py-8 ${themeClasses.bg} text-white rounded-[2.5rem] font-black text-2xl shadow-2xl uppercase active:scale-95 transition-all hover:bg-[#6fab1c]`}>INIZIA 🦴</button>
              <button onClick={() => setShowGeneralTestModal(null)} className="text-gray-300 font-black uppercase text-[10px] tracking-widest hover:text-gray-500 transition-colors">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
