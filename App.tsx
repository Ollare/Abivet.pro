
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
  "Corriamo verso il diploma! 🎓"
];

const LOADING_MESSAGES = [
  "Todo sta fiutando nuovi termini tecnici...",
  "Analisi dei vetrini in corso (Karma help!)...",
  "Teo sta mettendo in ordine i protocolli clinici...",
  "Bau! Quasi pronti con il referto AI!",
  "Sincronizzando i microchip della memoria..."
];

const AI_FEEDBACK_TITLES = ["🐾 Verdetto Todo", "🧪 Angolo Teo", "🐈 Appunti Karma", "🩺 Protocollo Todo"];

const themeClasses = {
  bg: 'bg-[#5c871c]',
  text: 'text-[#5c871c]',
  border: 'border-[#5c871c]',
  light: 'bg-[#f4f7ed]',
  ring: 'ring-[#5c871c]/20'
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [quizDB, setQuizDB] = useState<MultipleChoiceQuestion[]>([]);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [showGeneralTestModal, setShowGeneralTestModal] = useState<null | '1' | 'F'>(null);
  const [showDiplomaCongrats, setShowDiplomaCongrats] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  
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

  const STORAGE_KEYS = {
    CARDS: 'ab_v21_cards', QUIZ: 'ab_v21_quiz', HISTORY: 'ab_v21_history', BADGES: 'ab_v21_badges', REMINDERS: 'ab_v21_rem'
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view, currentIdx]);

  useEffect(() => {
    const load = (key: string) => localStorage.getItem(key);
    try {
      if (load(STORAGE_KEYS.CARDS)) setCards(JSON.parse(load(STORAGE_KEYS.CARDS)!));
      if (load(STORAGE_KEYS.QUIZ)) setQuizDB(JSON.parse(load(STORAGE_KEYS.QUIZ)!));
      if (load(STORAGE_KEYS.HISTORY)) setHistory(JSON.parse(load(STORAGE_KEYS.HISTORY)!));
      if (load(STORAGE_KEYS.BADGES)) setBadges(JSON.parse(load(STORAGE_KEYS.BADGES)!));
      if (load(STORAGE_KEYS.REMINDERS)) setReminders(JSON.parse(load(STORAGE_KEYS.REMINDERS)!));
      refreshQuote();
    } catch (e) { console.error("Persistence error", e); }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    localStorage.setItem(STORAGE_KEYS.QUIZ, JSON.stringify(quizDB));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  }, [cards, quizDB, history, badges, reminders]);

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
    return Math.round(history.reduce((a, b) => a + b.accuracy, 0) / history.length);
  }, [history]);

  const exam1Passed = history.some(h => h.subject === "Esame Primo Anno" && h.accuracy >= 60);
  const examFinalPassed = history.some(h => h.subject === "Esame Finale" && h.accuracy >= 60);
  const isFinalUnlocked = badges1.length === subj1.length && badges2.length === subj2.length && exam1Passed;

  const todoAdvice = useMemo(() => {
    const valid = history.filter(h => !h.subject.startsWith('Esame') && h.subject !== 'Tutto' && h.type === 'Quiz');
    const uniqueModulesTested = new Set(valid.map(h => h.subject));
    if (uniqueModulesTested.size < 5) return { locked: true, progress: uniqueModulesTested.size };
    
    const stats: Record<string, {acc: number, count: number, last: number}> = {};
    valid.forEach(h => {
      if (!stats[h.subject]) stats[h.subject] = { acc: 0, count: 0, last: 0 };
      stats[h.subject].acc += h.accuracy;
      stats[h.subject].count++;
      stats[h.subject].last = h.accuracy;
    });
    const worst = Object.entries(stats).sort((a,b) => a[1].last - b[1].last)[0];
    return { locked: false, subject: worst[0], accuracy: Math.round(worst[1].acc / worst[1].count), isFailed: worst[1].last < 60 };
  }, [history]);

  const refreshQuote = () => setCurrentQuote(TODO_QUOTES[Math.floor(Math.random() * TODO_QUOTES.length)]);

  const startQuizSession = async (s: string, type: 'Normal' | '1' | 'F' = 'Normal') => {
    let pool: MultipleChoiceQuestion[] = [];
    let count = 10;
    let time = null;

    if (type === '1') { count = 30; time = 30 * 60; } 
    else if (type === 'F') { count = 100; time = 60 * 60; }

    if (type === '1' || type === 'F') {
      setIsGenerating(true); setGenProgress(0);
      setLoadMsg(`Todo sta preparando il protocollo d'esame (${count} Q. con 5 opzioni)...`);
      const timer = setInterval(() => setGenProgress(p => p < 90 ? p + 1 : p), 700);
      try {
        pool = await generateBalancedExam(type as any, count);
        // NOTA: Per gli esami non sovrascriviamo il DB quiz locale per non perdere quelli dei moduli singoli
        setQuizDB(prev => [...prev, ...pool]);
        clearInterval(timer); setGenProgress(100);
      } catch(e) { clearInterval(timer); setIsGenerating(false); return alert("Errore connessione AI."); }
      setIsGenerating(false);
    } else {
      pool = s === 'Tutto' ? quizDB : quizDB.filter(q => q.subject === s);
      if (pool.length === 0) return alert("Genera prima le domande nel Laboratorio AI!");
      pool = pool.sort(() => Math.random() - 0.5).slice(0, 10);
    }
    
    setCurrentSessionQuiz(pool);
    setCurrentIdx(0); setUserSelections({}); setTimeLeft(time);
    setActiveSubject(type === '1' ? 'Esame Primo Anno' : type === 'F' ? 'Esame Finale' : s); 
    setView('quiz_session');
  };

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
      id: Math.random().toString(), date: Date.now(), subject: activeSubject, 
      type: isExam ? (activeSubject as any) : 'Quiz', 
      totalCards: currentSessionQuiz.length, correctAnswers: correct, accuracy: finalAccuracy,
      points: points, details: currentSessionQuiz.map((q, i) => ({ q, selected: userSelections[i] }))
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

  const generateLaboratoryItems = async (subject: string) => {
    if (isGenerating) return;
    setIsGenerating(true); setGenProgress(0);
    setLoadMsg(LOADING_MESSAGES[0]);
    const timer = setInterval(() => {
      setGenProgress(p => p < 95 ? p + 2 : p);
      setLoadMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 1200);
    try {
      const year = ABIVET_SUBJECTS[Year.First].includes(subject) ? Year.First : Year.Second;
      const [newCards, newQuiz] = await Promise.all([
        generateFlashcards(subject, year, [], 20),
        generateQuizQuestions(subject, year, [], 20)
      ]);
      
      // LOGICA OVERWRITE: Rimuovi vecchi dati di questo modulo prima di salvare i nuovi
      setCards(prev => [...prev.filter(c => c.subject !== subject), ...newCards]);
      setQuizDB(prev => [...prev.filter(q => q.subject !== subject), ...newQuiz]);
      
      clearInterval(timer); setGenProgress(100);
      setTimeout(() => setIsGenerating(false), 800);
    } catch (e) { clearInterval(timer); setIsGenerating(false); alert("Errore connessione AI."); }
  };

  const startFlashcardSession = (s: string) => {
    const pool = s === 'Tutto' ? cards : cards.filter(c => c.subject === s);
    if (pool.length === 0) return alert("Usa il Laboratorio AI per generare le flashcard!");
    setCurrentSessionCards(pool.sort(() => Math.random() - 0.5).slice(0, 10));
    setCurrentIdx(0); setCorrectCount(0); setActiveSubject(s); setView('session');
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col md:flex-row pb-24 md:pb-0 font-['Inter']">
      {/* Sidebar Desktop */}
      <aside className="w-80 bg-white border-r border-gray-100 hidden md:flex flex-col fixed inset-y-0 z-30 shadow-sm">
        <div className="p-10 border-b border-gray-50 text-center">
          <div onClick={refreshQuote} className={`w-20 h-20 mx-auto ${themeClasses.bg} rounded-[2.5rem] flex items-center justify-center text-white text-4xl shadow-2xl mb-4 cursor-pointer hover:rotate-6 transition-all active:scale-95`}>🐶</div>
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
            <button key={item.id} onClick={() => setView(item.id as AppView)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${view === item.id ? themeClasses.bg + ' text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>{item.icon} {item.label}</button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 md:ml-80 p-4 md:p-12 overflow-y-auto max-h-screen custom-scrollbar">
        {view === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn pb-12">
            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-150 rotate-12 pointer-events-none text-4xl">🦴🐾</div>
               <div onClick={refreshQuote} className={`w-28 h-28 md:w-32 md:h-32 ${themeClasses.bg} rounded-[2.5rem] flex items-center justify-center text-5xl md:text-6xl shadow-2xl cursor-pointer transition-all hover:scale-110 active:rotate-12`}>🐶</div>
               <div className="flex-1 text-center md:text-left space-y-3 z-10">
                  <h2 className="text-3xl md:text-4xl font-black italic text-gray-800">Bentornata Alice! 🐾</h2>
                  <div className={`${themeClasses.light} p-5 rounded-2xl border ${themeClasses.border} border-opacity-10 shadow-inner`}><p className={`${themeClasses.text} font-bold italic text-lg leading-relaxed`}>"{currentQuote}"</p></div>
                  <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Precisione Media:</span>
                     <div className="bg-gray-100 rounded-full h-3 w-32 overflow-hidden shadow-inner"><div className={`${themeClasses.bg} h-full transition-all duration-1000 shadow-[0_0_10px_rgba(92,135,28,0.5)]`} style={{width: `${totalAccuracy}%`}}></div></div>
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
                          <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-gray-500"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Risultato Recente: {todoAdvice.accuracy}%</p>
                          <p className="italic font-medium text-lg text-gray-600">"Alice, il mio fiuto indica che devi ripassare tutti i sottoargomenti di questo modulo!"</p>
                       </div>
                       <button onClick={() => startQuizSession(todoAdvice.subject!)} className="w-full md:w-auto px-12 py-6 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95">RIPETI QUIZ 🦴</button>
                    </div>
                  ) : (
                    <div className="p-10 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-center space-y-4">
                       <p className="text-lg font-bold text-gray-500 italic">"Alice, completa quiz in almeno 5 moduli diversi per attivare il mio fiuto clinico! ({todoAdvice.progress}/5)"</p>
                    </div>
                  )}
               </div>
            </section>

            {/* Missione Osso d'Oro */}
            <div className="bg-white p-8 md:p-16 rounded-[4.5rem] border border-gray-100 shadow-sm space-y-12">
               <h3 className="text-4xl md:text-5xl font-black italic tracking-tighter text-gray-900 text-center md:text-left">Missione Osso d'Oro 🦴</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className={`p-8 md:p-10 rounded-[3.5rem] border-4 flex flex-col gap-8 transition-all hover:scale-[1.03] relative overflow-hidden group shadow-lg ${badges1.length === subj1.length ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-100' : 'border-gray-50 bg-gray-50 opacity-60'}`}>
                    <div className="absolute -bottom-10 -right-10 opacity-10 text-9xl">🥇</div>
                    <span className="text-6xl drop-shadow-lg">🥇</span>
                    <h4 className="text-2xl font-black italic text-amber-900 leading-none">Esame 1° Anno</h4>
                    <div className="space-y-2 relative z-10">
                       <div className="flex justify-between text-[10px] font-black text-amber-800 uppercase tracking-widest"><span>Badge Moduli</span> <span>{badges1.length}/{subj1.length}</span></div>
                       <div className="h-4 bg-white/50 rounded-full overflow-hidden shadow-inner border border-amber-200/50"><div className="h-full bg-amber-500 transition-all duration-1000" style={{width: `${(badges1.length/subj1.length)*100}%`}}></div></div>
                    </div>
                    <button disabled={isGenerating} onClick={() => setShowGeneralTestModal('1')} className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase shadow-xl transition-all relative z-10 ${exam1Passed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>{exam1Passed ? "COMPLETATO ✅" : "AVVIA (30 Q.)"}</button>
                  </div>

                  <div className={`p-8 md:p-10 rounded-[3.5rem] border-4 flex flex-col gap-8 transition-all hover:scale-[1.03] relative overflow-hidden group shadow-lg ${badges2.length === subj2.length ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-100' : 'border-gray-50 bg-gray-50 opacity-60'}`}>
                    <div className="absolute -bottom-10 -right-10 opacity-10 text-9xl">🥈</div>
                    <span className="text-6xl drop-shadow-lg">🥈</span>
                    <h4 className="text-2xl font-black italic text-blue-900 leading-none">Esame Finale</h4>
                    <div className="space-y-2 relative z-10">
                       <div className="flex justify-between text-[10px] font-black text-blue-800 uppercase tracking-widest"><span>Badge Moduli</span> <span>{badges2.length}/{subj2.length}</span></div>
                       <div className="h-4 bg-white/50 rounded-full overflow-hidden shadow-inner border border-blue-200/50"><div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${(badges2.length/subj2.length)*100}%`}}></div></div>
                    </div>
                    <button disabled={isGenerating} onClick={() => setShowGeneralTestModal('F')} className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase shadow-xl transition-all relative z-10 ${examFinalPassed ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{examFinalPassed ? "COMPLETATO ✅" : "AVVIA (100 Q.)"}</button>
                  </div>

                  <div className={`p-8 md:p-10 rounded-[3.5rem] border-4 flex flex-col items-center text-center gap-8 transition-all hover:scale-[1.03] relative overflow-hidden group shadow-lg ${isFinalUnlocked ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-100' : 'border-gray-50 bg-gray-50 opacity-60'}`}>
                    <div className="absolute -bottom-10 -right-10 opacity-10 text-9xl">🏆</div>
                    <span className={`text-7xl drop-shadow-2xl ${isFinalUnlocked ? 'animate-bounce' : ''}`}>🏆</span>
                    <h4 className="text-2xl font-black italic text-emerald-900 h-10 flex items-center justify-center">Diploma Abivet</h4>
                    <button disabled={!isFinalUnlocked} onClick={() => setShowDiplomaCongrats(true)} className={`w-full py-7 rounded-[2rem] font-black text-lg uppercase shadow-2xl relative z-10 transition-all ${isFinalUnlocked ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-white'}`}>RITIRA DIPLOMA</button>
                  </div>
               </div>
            </div>

            {/* Laboratorio AI */}
            <section className="bg-gradient-to-br from-slate-900 via-gray-950 to-slate-900 p-8 md:p-14 rounded-[4.5rem] text-white space-y-10 relative overflow-hidden border-t-8 border-[#5c871c] shadow-2xl">
               <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
               <div className="flex items-center gap-5 relative z-10">
                  <div className="w-4 h-4 bg-[#5c871c] rounded-full animate-ping"></div>
                  <div><h3 className="text-3xl md:text-4xl font-black italic tracking-tighter">🧪 Laboratorio Analisi AI</h3><p className="text-[10px] font-black text-[#5c871c] uppercase tracking-[0.5em]">Standard Abivet Clinical Protocol</p></div>
               </div>
               <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                  <div className="flex-1 relative group">
                    <select 
                      value={selectedLabSubject} 
                      onChange={(e) => setSelectedLabSubject(e.target.value)} 
                      className="w-full bg-white/5 border-2 border-white/10 p-7 rounded-[2.5rem] font-bold text-lg outline-none backdrop-blur-md focus:border-[#5c871c] transition-all hover:bg-white/10 cursor-pointer shadow-inner appearance-none relative z-10"
                    >
                      {allSubj.map(s => <option key={s} value={s} className="bg-gray-950 text-white">{s}</option>)}
                    </select>
                    {/* Singola Freccia Custom - Estetica Abivet */}
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
          </div>
        )}

        {/* Quiz Session View */}
        {view === 'quiz_session' && currentSessionQuiz[currentIdx] && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn pb-40 px-2">
            <div className="bg-white p-8 md:p-20 rounded-[4.5rem] shadow-2xl border border-gray-100 space-y-12 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 right-0 h-2 bg-gray-50"><div className={`${themeClasses.bg} h-full transition-all duration-500`} style={{width: `${((currentIdx + 1)/currentSessionQuiz.length)*100}%`}}></div></div>
               <div className="flex justify-between items-center absolute top-6 left-10 right-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Domanda {currentIdx + 1} di {currentSessionQuiz.length}</span>
                    {timeLeft !== null && <div className={`px-6 py-2 rounded-full font-black text-sm border-2 ${timeLeft < 300 ? 'bg-rose-50 border-rose-500 text-rose-500 animate-pulse' : 'bg-white border-gray-100 text-gray-400'}`}>⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>}
               </div>
               <div className="mt-12"><p className="text-xl md:text-3xl font-black leading-tight italic text-gray-800">{currentSessionQuiz[currentIdx].question}</p></div>
               <div className="grid grid-cols-1 gap-4 text-left">
                  {currentSessionQuiz[currentIdx].options.map((opt, i) => (
                    <button key={i} onClick={() => setUserSelections(v => ({...v, [currentIdx]: i}))} className={`p-5 md:p-7 rounded-[2rem] border-2 flex items-center gap-6 transition-all ${userSelections[currentIdx] === i ? 'border-[#5c871c] bg-[#f4f7ed] shadow-lg scale-[1.01]' : 'border-gray-50 bg-gray-50/50 hover:bg-gray-100 active:scale-95'}`}>
                       <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${userSelections[currentIdx] === i ? themeClasses.bg + ' text-white shadow-lg' : 'bg-white text-gray-300 border'}`}>{String.fromCharCode(65+i)}</span>
                       <span className="text-xs md:text-base font-bold text-gray-700 flex-1">{opt}</span>
                    </button>
                  ))}
               </div>
            </div>
            <div className="flex justify-between items-center px-6">
               <button disabled={currentIdx === 0} onClick={() => setCurrentIdx(p => p - 1)} className="px-10 py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-30">← Indietro</button>
               {currentIdx < currentSessionQuiz.length - 1 ? (
                 <button onClick={() => setCurrentIdx(p => p + 1)} className={`px-10 py-5 ${themeClasses.bg} text-white rounded-[2rem] font-black uppercase shadow-xl hover:bg-[#6fab1c] transition-all active:scale-95`}>Avanti →</button>
               ) : (
                 <button onClick={handleCompleteQuiz} className="px-14 py-6 bg-amber-500 text-white rounded-[2rem] font-black uppercase shadow-2xl animate-pulse hover:bg-amber-600 transition-all active:scale-95">REFERTO 🦴</button>
               )}
            </div>
          </div>
        )}

        {/* Review View */}
        {view === 'review' && lastSessionResult && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn py-12 px-2 pb-32">
             <div className="text-center space-y-6">
                <div className={`w-44 h-44 rounded-full mx-auto flex flex-col items-center justify-center font-black text-white text-5xl ${lastSessionResult.accuracy >= 60 ? themeClasses.bg : 'bg-rose-500'} shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-8 border-white animate-fadeIn`}>{Math.round(lastSessionResult.accuracy)}%</div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black italic">Referto Clinico 🐾</h2>
                    <p className="text-3xl font-black text-[#5c871c] italic">Indovinate: {lastSessionResult.correctAnswers} / {lastSessionResult.totalCards}</p>
                    {lastSessionResult.subject.startsWith('Esame') && (
                        <div className="space-y-1 mt-2">
                            <p className="text-lg font-black text-gray-400 uppercase tracking-widest">Punteggio Abivet: {lastSessionResult.points?.toFixed(2)} pts</p>
                            <p className="text-[10px] font-bold text-gray-300">Soglia Diploma: 60%</p>
                        </div>
                    )}
                </div>
                <button onClick={() => setView('dashboard')} className="px-12 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-black transition-all active:scale-95">Torna alla Dashboard</button>
             </div>
             <div className="space-y-8">
                 {lastSessionResult.details?.map((item, idx) => (
                   <div key={idx} className={`p-10 rounded-[3.5rem] bg-white border-2 ${item.selected === item.q.correctIndex ? 'border-[#5c871c]/10 shadow-sm' : 'border-rose-100 shadow-xl shadow-rose-50'} space-y-8`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Domanda {idx + 1} ({item.q.subject})</span><p className="text-2xl font-black italic leading-tight text-gray-800">{item.q.question}</p></div>
                        {item.selected === item.q.correctIndex ? <span className="text-[#5c871c] text-3xl">✓</span> : <span className="text-rose-500 text-3xl">✕</span>}
                      </div>
                      <div className="space-y-4">
                         {item.q.options.map((opt: any, i: number) => (
                           <div key={i} className={`p-6 rounded-[2rem] flex items-center gap-4 font-bold border transition-colors ${i === item.q.correctIndex ? 'bg-[#f4f7ed] border-[#5c871c]/30 text-[#5c871c]' : i === item.selected ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'}`}>
                             <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === item.q.correctIndex ? themeClasses.bg + ' text-white shadow-md' : i === item.selected ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-gray-300'}`}>{String.fromCharCode(65+i)}</span> {opt}
                           </div>
                         ))}
                      </div>
                      <div className="p-8 bg-[#f4f7ed] rounded-[2.5rem] border border-[#5c871c]/10">
                         <p className="text-[10px] font-black uppercase tracking-widest text-[#5c871c] mb-3 flex items-center gap-2">🐶 {AI_FEEDBACK_TITLES[idx % 4]}</p>
                         <p className="italic text-sm text-gray-700 leading-relaxed font-medium">{item.q.explanation}</p>
                      </div>
                   </div>
                 ))}
             </div>
          </div>
        )}

        {/* Altre Viste (Libreria, Badge, Agenda, Sessione Card) */}
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
               <div className="p-8 bg-[#f4f7ed] rounded-[2.5rem] border border-[#5c871c]/20 inline-block shadow-sm">
                  <p className="text-[#5c871c] font-black uppercase tracking-widest text-[11px] mb-2 flex items-center gap-2">🐶 Istruzioni di Todo:</p>
                  <p className="text-gray-600 font-bold italic text-sm">"Ottieni almeno l'80% di precisione in un quiz modulo per sbloccare il suo badge clinico Alice!"</p>
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

        {view === 'calendar' && <div className="max-w-5xl mx-auto animate-fadeIn pb-32"><StudyCalendar reminders={reminders} history={history} badges={badges} onAddReminder={(r) => setReminders(p => [...p, {...r, id: Math.random().toString(36).substr(2, 9)}])} onDeleteReminder={(id) => setReminders(p => p.filter(x => x.id !== id))} onToggleReminder={(id) => setReminders(p => p.map(x => x.id === id ? {...x, completed: !x.completed} : x))} /></div>}

        {view === 'session' && currentSessionCards[currentIdx] && (
          <div className="max-w-4xl mx-auto py-12 animate-fadeIn space-y-12 px-2 pb-32">
            <FlashcardItem key={currentSessionCards[currentIdx].id} card={currentSessionCards[currentIdx]} onGrade={(correct) => {
               const newCorrect = correct ? correctCount + 1 : correctCount;
               setCorrectCount(newCorrect);
               if (currentIdx < currentSessionCards.length - 1) setCurrentIdx(p => p + 1);
               else {
                  const acc = (newCorrect / currentSessionCards.length) * 100;
                  const res: TestResult = { id: Math.random().toString(), date: Date.now(), subject: activeSubject, type: 'Flashcard', totalCards: currentSessionCards.length, correctAnswers: newCorrect, accuracy: acc };
                  setHistory(prev => [res, ...prev]); setLastSessionResult(res); setView('review');
               }
            }} />
          </div>
        )}

        {view === 'history' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn pb-20 px-2">
             <div className="text-center md:text-left space-y-2">
                <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-gray-800">Registro Analisi Cliniche 🩺</h2>
                <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Archivio storico referti Alice</p>
             </div>
             <div className="hidden md:block bg-white rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <tr className="border-b"><th className="px-12 py-10">Data</th><th className="px-12 py-10">Modulo / Unità</th><th className="px-12 py-10 text-right">Esito</th></tr>
                   </thead>
                   <tbody className="divide-y text-xs font-bold">
                      {history.map(h => (
                        <tr key={h.id} onClick={() => { setLastSessionResult(h); setView('review'); }} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                           <td className="px-12 py-10 text-gray-400 font-medium">{new Date(h.date).toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' })}</td>
                           <td className="px-12 py-10 font-black text-gray-900 text-lg italic">{h.subject} <span className="text-[10px] ml-2 opacity-30 tracking-widest uppercase">({h.type})</span></td>
                           <td className={`px-12 py-10 text-right font-black text-4xl ${h.accuracy >= 60 ? themeClasses.text : 'text-rose-500'}`}>{Math.round(h.accuracy)}%</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </main>

      {/* Mobile Nav */}
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

      {/* Esame Modal */}
      {showGeneralTestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-fadeIn px-4">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 text-center space-y-10 shadow-3xl">
            <h4 className="text-4xl font-black italic tracking-tighter leading-none uppercase text-gray-900">PRONTA ALICE? 🐾</h4>
            <div className="p-8 bg-[#f4f7ed] rounded-[2.5rem] space-y-2 border border-[#5c871c]/10 shadow-inner">
                <p className="text-gray-700 font-black text-lg">{showGeneralTestModal === '1' ? 'Esame 1° Anno: 30 Q. - 30 min.' : 'Esame Finale: 100 Q. - 60 min.'}</p>
                <p className="text-xs text-gray-400 italic font-bold tracking-widest uppercase">Protocollo d'Esame Abivet.Pro</p>
                <p className="text-[10px] text-amber-600 font-black uppercase">Soglia Diploma: 60%</p>
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
