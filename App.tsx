
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Flashcard, MultipleChoiceQuestion, TestResult, Year, ABIVET_SUBJECTS, StudyReminder, ThemeColor, Badge, SUBJECT_ICONS } from './types';
import { ICONS } from './constants';
import { FlashcardItem } from './components/FlashcardItem';
import { StudyCalendar } from './components/StudyCalendar';
import { generateFlashcards, generateQuizQuestions } from './services/geminiService';

const TODO_QUOTES = [
  "Bau Alice! Ho fiutato un 30 lode in Anatomia oggi! 🐾",
  "Coda a mille! Pronta a sbranare i libri? 🦴",
  "Alice, sei più sveglia di un Jack Russell alle 6 del mattino! 🐶",
  "Woof! Sei un vero levriero dello studio, Alice! 🏎️",
  "Non farti mordere dall'ansia! 👋",
  "Alice, ho fiutato che oggi la Farmacologia non ha scampo! Woof! 💊",
  "Sei il mio mito! Faccio il tifo per te! ❤️",
  "Bau! Corriamo verso il diploma, Alice! 🎓"
];

const LOADING_MESSAGES = [
  "Todo sta prelevando campioni di conoscenza...",
  "Karma sta analizzando i vetrini della biologia...",
  "Teo sta mettendo in ordine i protocolli clinici...",
  "Bau! Quasi pronti con il referto Alice!",
  "Fiutando nuove domande anatomiche... Woof!"
];

const AI_FEEDBACK_TITLES = [
  "🐾 Il Verdetto di Todo",
  "🧪 L'Angolo Tecnico di Teo",
  "🐈 Appunti Felini di Karma",
  "🧬 Referto del Jack Russell",
  "🩺 Protocollo di Todo",
  "🩹 Analisi d'Urgenza",
  "🧠 Memoria di Teo"
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [quizDB, setQuizDB] = useState<MultipleChoiceQuestion[]>([]);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [theme, setTheme] = useState<ThemeColor>('emerald');
  const [showGeneralTestModal, setShowGeneralTestModal] = useState<null | '1' | '2' | 'F'>(null);
  const [currentQuote, setCurrentQuote] = useState("");
  
  const [selectedLabSubject, setSelectedLabSubject] = useState<string>(ABIVET_SUBJECTS[Year.First][0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [currentLoadMsg, setCurrentLoadMsg] = useState("");

  const [currentSessionCards, setCurrentSessionCards] = useState<Flashcard[]>([]);
  const [currentSessionQuiz, setCurrentSessionQuiz] = useState<MultipleChoiceQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userSelections, setUserSelections] = useState<Record<number, number>>({});
  const [activeSubject, setActiveSubject] = useState<string>('Tutto');
  const [lastSessionResult, setLastSessionResult] = useState<TestResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const STORAGE_KEYS = {
    CARDS: 'abivet_alice_cards_v22',
    QUIZ: 'abivet_alice_quiz_v22',
    HISTORY: 'abivet_alice_history_v22',
    BADGES: 'abivet_alice_badges_v22',
    REMINDERS: 'abivet_alice_reminders_v22',
    THEME: 'abivet_alice_theme_v22'
  };

  useEffect(() => {
    const load = (key: string) => localStorage.getItem(key);
    if (load(STORAGE_KEYS.CARDS)) setCards(JSON.parse(load(STORAGE_KEYS.CARDS)!));
    if (load(STORAGE_KEYS.QUIZ)) setQuizDB(JSON.parse(load(STORAGE_KEYS.QUIZ)!));
    if (load(STORAGE_KEYS.HISTORY)) setHistory(JSON.parse(load(STORAGE_KEYS.HISTORY)!));
    if (load(STORAGE_KEYS.BADGES)) setBadges(JSON.parse(load(STORAGE_KEYS.BADGES)!));
    if (load(STORAGE_KEYS.REMINDERS)) setReminders(JSON.parse(load(STORAGE_KEYS.REMINDERS)!));
    if (load(STORAGE_KEYS.THEME)) setTheme(load(STORAGE_KEYS.THEME) as ThemeColor || 'emerald');
    refreshQuote();
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards)), [cards]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.QUIZ, JSON.stringify(quizDB)), [quizDB]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges)), [badges]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders)), [reminders]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.THEME, theme), [theme]);

  const subj1 = ABIVET_SUBJECTS[Year.First];
  const subj2 = ABIVET_SUBJECTS[Year.Second];
  const allSubj = [...subj1, ...subj2];

  const badges1 = badges.filter(b => subj1.includes(b.subject));
  const badges2 = badges.filter(b => subj2.includes(b.subject));

  const isExam1Unlocked = badges1.length === subj1.length;
  const isExam2Unlocked = badges2.length === subj2.length;
  
  const exam1Passed = history.some(h => h.subject === "Esame Primo Anno" && h.accuracy >= 60);
  const exam2Passed = history.some(h => h.subject === "Esame Secondo Anno" && h.accuracy >= 60);

  const isFinalUnlocked = isExam1Unlocked && isExam2Unlocked && exam1Passed && exam2Passed;

  const totalAccuracy = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round(history.reduce((a, b) => a + b.accuracy, 0) / history.length);
  }, [history]);

  const refreshQuote = () => setCurrentQuote(TODO_QUOTES[Math.floor(Math.random() * TODO_QUOTES.length)]);

  const themeClasses = useMemo(() => {
    const themes = {
      emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', light: 'bg-emerald-50', hover: 'hover:bg-emerald-700', shadow: 'shadow-emerald-200' },
      blue: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', light: 'bg-blue-50', hover: 'hover:bg-blue-700', shadow: 'shadow-blue-200' },
      indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600', light: 'bg-indigo-50', hover: 'hover:bg-indigo-700', shadow: 'shadow-indigo-200' },
      rose: { bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', light: 'bg-rose-50', hover: 'hover:bg-rose-700', shadow: 'shadow-rose-200' },
      amber: { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600', light: 'bg-amber-50', hover: 'hover:bg-amber-700', shadow: 'shadow-amber-200' },
    };
    return themes[theme];
  }, [theme]);

  const generateLaboratoryItems = async (subject: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenProgress(5);
    setCurrentLoadMsg(LOADING_MESSAGES[0]);
    
    const existingC = cards.filter(c => c.subject === subject).map(c => c.concept);
    const existingQ = quizDB.filter(q => q.subject === subject).map(q => q.question);

    const interval = setInterval(() => {
      setCurrentLoadMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      setGenProgress(p => p < 90 ? p + 2 : p);
    }, 2000);

    try {
      const year = subj1.includes(subject) ? Year.First : Year.Second;
      // Generazione 20 Flashcard e 20 Quiz richiesti
      const [newCards, newQuiz] = await Promise.all([
        generateFlashcards(subject, year, existingC, 20),
        generateQuizQuestions(subject, year, existingQ, 20)
      ]);
      setCards(prev => [...prev, ...newCards]);
      setQuizDB(prev => [...prev, ...newQuiz]);
      setGenProgress(100);
      clearInterval(interval);
      setTimeout(() => { setIsGenerating(false); setGenProgress(0); refreshQuote(); }, 800);
    } catch (e) {
      clearInterval(interval);
      alert("Bau! Errore tecnico nel laboratorio.");
      setIsGenerating(false);
    }
  };

  const checkBadgeUnlock = (subject: string, accuracy: number) => {
    if (accuracy >= 80 && !badges.find(b => b.subject === subject)) {
      setBadges(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), subject, icon: SUBJECT_ICONS[subject] || "🏆", earnedDate: Date.now() }]);
      alert(`BAU! Alice, hai guadagnato il Badge in ${subject}! 🦴🏆`);
    }
  };

  const finishSession = (type: any, final: number, details?: any[], totalCount?: number) => {
    const count = totalCount || details?.length || 10;
    const accuracy = (final / count) * 100;
    const res: TestResult = { id: Math.random().toString(36).substr(2,9), date: Date.now(), subject: activeSubject, type, totalCards: count, correctAnswers: final, accuracy, details };
    setHistory(prev => [res, ...prev]); 
    setLastSessionResult(res); 
    if (activeSubject !== 'Tutto' && !activeSubject.startsWith("Esame")) checkBadgeUnlock(activeSubject, accuracy);
    setView('review');
  };

  const handleFlashcardGrade = (c: boolean) => {
    const newCorrect = c ? correctCount + 1 : correctCount;
    setCorrectCount(newCorrect);
    if (currentIdx < currentSessionCards.length - 1) { setCurrentIdx(p => p + 1); }
    else finishSession('Flashcard', newCorrect, undefined, currentSessionCards.length);
  };

  const confirmQuiz = () => {
    let final = 0;
    const details = currentSessionQuiz.map((q, i) => {
      const isCorrect = userSelections[i] === q.correctIndex;
      if (isCorrect) final++;
      return { q, selected: userSelections[i] };
    });
    finishSession(activeSubject.startsWith("Esame") ? activeSubject : 'Quiz', final, details);
  };

  const startQuizSession = (s: string, type: 'Normal' | '1' | '2' | 'F' = 'Normal') => {
    let pool: MultipleChoiceQuestion[] = [];
    let label = s;
    if (type === '1') { pool = quizDB.filter(q => subj1.includes(q.subject)); label = "Esame Primo Anno"; }
    else if (type === '2') { pool = quizDB.filter(q => subj2.includes(q.subject)); label = "Esame Secondo Anno"; }
    else if (type === 'F') { pool = quizDB; label = "Esame Finale"; }
    else { pool = s === 'Tutto' ? quizDB : quizDB.filter(q => q.subject === s); }

    if (pool.length === 0) return alert(`Bau! Non hai ancora contenuti per questo esame.`);
    // Ridotto il numero di domande a 10 per sessione
    setCurrentSessionQuiz(pool.sort(() => Math.random() - 0.5).slice(0, 10));
    setCurrentIdx(0); setUserSelections({}); setActiveSubject(label); setView('quiz_session');
  };

  const startFlashcardSession = (s: string) => {
    const pool = s === 'Tutto' ? cards : cards.filter(c => c.subject === s);
    if (pool.length === 0) return alert(`Bau! Non hai ancora cards per ${s}. Generane alcune nel laboratorio!`);
    setCurrentSessionCards(pool.sort(() => Math.random() - 0.5).slice(0, 10));
    setCurrentIdx(0); 
    setCorrectCount(0);
    setActiveSubject(s); 
    setView('session');
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col md:flex-row pb-24 md:pb-0 font-sans">
      
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-100 hidden md:flex flex-col fixed inset-y-0 z-30 shadow-sm overflow-y-auto custom-scrollbar">
        <div className="p-10 flex flex-col items-center border-b border-gray-50">
          <div onClick={refreshQuote} className={`w-20 h-20 ${themeClasses.bg} rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl cursor-pointer hover:rotate-12 transition-all text-4xl active:scale-90`}>🐶</div>
          <h1 className="text-3xl font-black text-gray-900 italic">ABIVET<span className={themeClasses.text}>.PRO</span></h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3 text-center">todo.ai 🐾</p>
        </div>
        <nav className="flex-1 px-6 space-y-2 mt-8">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all ${view === 'dashboard' ? themeClasses.bg + ' text-white shadow-xl shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}><ICONS.Dashboard /> Dashboard</button>
          <button onClick={() => setView('study')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all ${view === 'study' ? themeClasses.bg + ' text-white shadow-xl shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}><ICONS.Study /> Libreria Moduli</button>
          <button onClick={() => setView('badges')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all ${view === 'badges' ? themeClasses.bg + ' text-white shadow-xl shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> Bacheca Badge</button>
          <button onClick={() => setView('calendar')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all ${view === 'calendar' ? themeClasses.bg + ' text-white shadow-xl shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Calendario</button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all ${view === 'history' ? themeClasses.bg + ' text-white shadow-xl shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}><ICONS.History /> Registro</button>
          <button onClick={() => setView('settings')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-black transition-all ${view === 'settings' ? themeClasses.bg + ' text-white shadow-xl shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Impostazioni</button>
        </nav>
        <div className="p-6">
           <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 flex flex-col items-center text-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Esito Globale</span>
              <span className={`text-5xl font-black ${totalAccuracy >= 60 ? themeClasses.text : 'text-rose-500'}`}>{totalAccuracy}%</span>
           </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-80 p-4 md:p-12 overflow-y-auto max-h-screen custom-scrollbar pb-32">
        
        {view === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
            <div className="flex flex-col md:row gap-8 items-center bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
               <div onClick={refreshQuote} className={`w-28 h-28 md:w-36 md:h-36 ${themeClasses.bg} rounded-[3rem] flex items-center justify-center text-6xl shadow-2xl cursor-pointer hover:scale-105 active:rotate-12 transition-all`}>🐶</div>
               <div className="flex-1 space-y-4 text-center md:text-left">
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 italic tracking-tighter">Bentornata, <span className={themeClasses.text}>Alice!</span>🐾</h2>
                  <div className={`${themeClasses.light} p-6 rounded-[2rem] border ${themeClasses.border} border-opacity-10 shadow-inner`}><p className={`${themeClasses.text} font-bold italic`}>"{currentQuote}"</p></div>
               </div>
            </div>

            {/* Missione Osso d'Oro - Restyling stile missione */}
            <section className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-600 rounded-[4.5rem] blur opacity-15 group-hover:opacity-30 transition duration-1000"></div>
               <div className="relative p-10 md:p-16 rounded-[4.5rem] bg-white border-2 border-gray-50 shadow-sm space-y-16">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                     <div className="space-y-3">
                        <h3 className="text-5xl font-black text-gray-900 italic tracking-tighter">Missione Osso d'Oro 🦴</h3>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Il tuo cammino clinico passo dopo passo</p>
                     </div>
                     <div className="flex -space-x-4">
                        <div className={`w-16 h-16 rounded-full border-4 border-white ${isExam1Unlocked ? 'bg-amber-400' : 'bg-gray-100'} flex items-center justify-center text-2xl shadow-xl transition-all`}>🥇</div>
                        <div className={`w-16 h-16 rounded-full border-4 border-white ${isExam2Unlocked ? 'bg-blue-400' : 'bg-gray-100'} flex items-center justify-center text-2xl shadow-xl transition-all`}>🥈</div>
                        <div className={`w-16 h-16 rounded-full border-4 border-white ${isFinalUnlocked ? 'bg-emerald-500' : 'bg-gray-100'} flex items-center justify-center text-2xl shadow-xl transition-all`}>🏆</div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                     {/* Step 1: Primo Anno */}
                     <div className={`relative p-10 rounded-[3.5rem] border-2 flex flex-col gap-6 transition-all ${isExam1Unlocked ? 'border-amber-200 bg-amber-50/50 shadow-lg scale-105' : 'border-gray-50 opacity-50'}`}>
                        <div className="flex justify-between items-start">
                           <span className="text-5xl">🥇</span>
                           <h4 className="text-xl font-black italic">Esame 1° Anno</h4>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                           <div className="bg-amber-400 h-full transition-all duration-500" style={{width: `${(badges1.length/subj1.length)*100}%`}}></div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{badges1.length}/{subj1.length} BADGE OTTENUTI</p>
                        <button disabled={!isExam1Unlocked} onClick={() => setShowGeneralTestModal('1')} className={`py-4 rounded-2xl font-black text-xs uppercase ${isExam1Unlocked ? 'bg-amber-500 text-white shadow-xl hover:bg-amber-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>AVVIA MISSIONE</button>
                        {exam1Passed && <span className="text-[10px] text-emerald-600 font-black text-center uppercase tracking-widest bg-emerald-50 py-2 rounded-xl">SUPERATA ✅</span>}
                     </div>

                     {/* Step 2: Secondo Anno */}
                     <div className={`relative p-10 rounded-[3.5rem] border-2 flex flex-col gap-6 transition-all ${isExam2Unlocked ? 'border-blue-200 bg-blue-50/50 shadow-lg scale-105' : 'border-gray-50 opacity-50'}`}>
                        <div className="flex justify-between items-start">
                           <span className="text-5xl">🥈</span>
                           <h4 className="text-xl font-black italic">Esame 2° Anno</h4>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                           <div className="bg-blue-400 h-full transition-all duration-500" style={{width: `${(badges2.length/subj2.length)*100}%`}}></div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{badges2.length}/{subj2.length} BADGE OTTENUTI</p>
                        <button disabled={!isExam2Unlocked} onClick={() => setShowGeneralTestModal('2')} className={`py-4 rounded-2xl font-black text-xs uppercase ${isExam2Unlocked ? 'bg-blue-500 text-white shadow-xl hover:bg-blue-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>AVVIA MISSIONE</button>
                        {exam2Passed && <span className="text-[10px] text-emerald-600 font-black text-center uppercase tracking-widest bg-emerald-50 py-2 rounded-xl">SUPERATA ✅</span>}
                     </div>

                     {/* Step 3: Finale */}
                     <div className={`relative p-10 rounded-[3.5rem] border-2 flex flex-col gap-6 transition-all ${isFinalUnlocked ? 'border-emerald-200 bg-emerald-50 shadow-2xl scale-110' : 'border-gray-50 opacity-30'}`}>
                        <div className="flex justify-between items-start">
                           <span className="text-6xl animate-bounce">🏆</span>
                           <h4 className="text-xl font-black italic">Traguardo Finale</h4>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-1">Raggiungi il Diploma Abivet conquistando l'Osso d'Oro.</p>
                        <button disabled={!isFinalUnlocked} onClick={() => setShowGeneralTestModal('F')} className={`py-5 rounded-3xl font-black text-sm uppercase ${isFinalUnlocked ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-200 hover:bg-emerald-700' : 'bg-gray-100 text-gray-400'}`}>DIPLOMA ABIVET</button>
                     </div>
                  </div>
               </div>
            </section>

            {/* Laboratorio Analisi Colorato */}
            <section className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full"></div>
               <div className="relative z-10 space-y-10">
                  <div className="space-y-3 text-center md:text-left">
                     <h3 className="text-3xl font-black text-white italic tracking-tight flex items-center gap-3">🧪 Laboratorio di Analisi Cliniche AI</h3>
                     <p className="text-gray-400 font-bold text-sm">Creiamo 20 Flashcard e 20 Quiz Abivet per la tua specializzazione.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-5">
                     <select value={selectedLabSubject} onChange={(e) => setSelectedLabSubject(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-[2.5rem] px-10 py-7 text-sm font-black text-white outline-none appearance-none backdrop-blur-md focus:bg-white/10 transition-all">
                        {allSubj.map(s => <option key={s} value={s} className="bg-[#0F172A]">{s}</option>)}
                     </select>
                     <button disabled={isGenerating} onClick={() => generateLaboratoryItems(selectedLabSubject)} className={`px-16 py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-widest transition-all ${isGenerating ? 'bg-emerald-900 text-emerald-400' : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-2xl shadow-emerald-500/20 active:scale-95'}`}>
                        {isGenerating ? "Analisi in corso..." : "Avvia Analisi 🧪"}
                     </button>
                  </div>
                  {isGenerating && (
                    <div className="space-y-4 animate-fadeIn">
                       <div className="w-full h-5 bg-black/40 rounded-full overflow-hidden p-1 border border-white/5 shadow-inner">
                          <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 rounded-full transition-all duration-300" style={{width: `${genProgress}%`}}></div>
                       </div>
                       <div className="flex justify-between items-center px-2">
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">{currentLoadMsg}</p>
                          <span className="text-xs font-black text-white">{genProgress}%</span>
                       </div>
                    </div>
                  )}
               </div>
            </section>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn">
            <header className="space-y-4">
              <h2 className="text-5xl font-black text-gray-900 italic tracking-tighter">Impostazioni Pro ⚙️</h2>
              <p className="text-gray-400 font-bold">Personalizza la tua interfaccia di studio Alice.</p>
            </header>
            
            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm space-y-10">
               <section className="space-y-8">
                  <h3 className="text-xl font-black text-gray-800 italic">Tema dell'App</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {(['emerald', 'blue', 'indigo', 'rose', 'amber'] as ThemeColor[]).map((c) => (
                      <button 
                        key={c} 
                        onClick={() => setTheme(c)}
                        className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${theme === c ? 'border-emerald-200 bg-gray-50' : 'border-transparent bg-white shadow-sm hover:scale-105'}`}
                      >
                        <div className={`w-12 h-12 rounded-full ${
                          c === 'emerald' ? 'bg-emerald-500' : 
                          c === 'blue' ? 'bg-blue-500' : 
                          c === 'indigo' ? 'bg-indigo-500' : 
                          c === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                        } shadow-lg`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{c}</span>
                      </button>
                    ))}
                  </div>
               </section>

               <section className="p-10 rounded-[3rem] bg-gray-50 space-y-4 border border-gray-100">
                  <p className="text-sm font-bold text-gray-600 leading-relaxed italic">"Bau Alice! Qui puoi cambiare i colori della nostra clinica. Quale ti ispira di più oggi per studiare?" - Todo.ai</p>
               </section>
               
               <button onClick={() => setView('dashboard')} className={`w-full py-6 ${themeClasses.bg} text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all`}>Torna alla Dashboard 🐾</button>
            </div>
          </div>
        )}

        {view === 'badges' && (
          <div className="max-w-6xl mx-auto space-y-12 animate-fadeIn pb-16">
            <h2 className="text-5xl font-black text-gray-900 italic tracking-tighter leading-none">Bacheca Specialista</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               {allSubj.map(s => {
                 const b = badges.find(x => x.subject === s);
                 return (
                   <div key={s} className={`p-10 rounded-[3.5rem] border-2 transition-all flex flex-col items-center text-center gap-6 ${b ? 'bg-white border-emerald-100 shadow-xl' : 'bg-gray-50 border-gray-100 opacity-40 grayscale'}`}>
                      <span className="text-6xl">{SUBJECT_ICONS[s]}</span>
                      <p className="text-sm font-black text-gray-900 leading-tight h-10 flex items-center">{s}</p>
                      {b ? <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">CONQUISTATO 🦴</span> : <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">OBIETTIVO 80%</span>}
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {view === 'quiz_session' && currentSessionQuiz[currentIdx] && (
          <div className="max-w-4xl mx-auto py-12 space-y-12 animate-fadeIn pb-40 px-2">
            <div className="flex justify-between items-center px-10">
              <h2 className="text-2xl font-black text-gray-900 italic leading-none">{activeSubject}</h2>
              <button onClick={() => setView('dashboard')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Abbandona</button>
            </div>
            
            <div className="bg-white p-12 md:p-16 rounded-[4.5rem] border border-gray-100 shadow-xl space-y-12">
               <p className="text-3xl md:text-4xl font-black text-gray-900 leading-tight italic tracking-tighter">{currentSessionQuiz[currentIdx].question}</p>
               <div className="grid grid-cols-1 gap-4">
                  {currentSessionQuiz[currentIdx].options.map((opt, i) => (
                    <button key={i} onClick={() => setUserSelections(v => ({...v, [currentIdx]: i}))} className={`p-7 md:p-9 rounded-[2.5rem] border-2 text-left transition-all flex items-center gap-6 ${userSelections[currentIdx] === i ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-50 bg-gray-50/20'}`}>
                       <span className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl ${userSelections[currentIdx] === i ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>{String.fromCharCode(65+i)}</span>
                       <span className={`text-base md:text-xl font-bold ${userSelections[currentIdx] === i ? 'text-emerald-900' : 'text-gray-700'}`}>{opt}</span>
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex justify-between items-center px-6">
               <button disabled={currentIdx === 0} onClick={() => setCurrentIdx(p => p - 1)} className={`px-12 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all ${currentIdx === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black shadow-xl active:scale-95'}`}>← Indietro</button>
               {currentIdx < currentSessionQuiz.length - 1 ? (
                 <button onClick={() => setCurrentIdx(p => p + 1)} className="px-12 py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95">Successiva →</button>
               ) : (
                 <button onClick={confirmQuiz} className="px-14 py-6 bg-amber-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-amber-200 animate-pulse">🦴 CONFERMA ESAME 🐾</button>
               )}
            </div>

            <div className="px-12 flex flex-col gap-3">
               <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                  <span>Progresso Esame</span>
                  <span>{currentIdx + 1} / {currentSessionQuiz.length}</span>
               </div>
               <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                  <div className={`${themeClasses.bg} h-full transition-all duration-300 rounded-full`} style={{width: `${((currentIdx + 1)/currentSessionQuiz.length)*100}%`}}></div>
               </div>
            </div>
          </div>
        )}

        {view === 'session' && currentSessionCards[currentIdx] && (
          <div className="max-w-4xl mx-auto py-12 space-y-12 animate-fadeIn pb-40 px-2">
            <div className="flex justify-between items-center px-10">
              <h2 className="text-2xl font-black text-gray-900 italic leading-none">{activeSubject}</h2>
              <button onClick={() => setView('dashboard')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Abbandona</button>
            </div>
            
            <FlashcardItem 
              card={currentSessionCards[currentIdx]} 
              onGrade={handleFlashcardGrade}
            />

            <div className="px-12 flex flex-col gap-3">
               <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                  <span>Progresso Studio</span>
                  <span>{currentIdx + 1} / {currentSessionCards.length}</span>
               </div>
               <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                  <div className={`${themeClasses.bg} h-full transition-all duration-300 rounded-full`} style={{width: `${((currentIdx + 1)/currentSessionCards.length)*100}%`}}></div>
               </div>
            </div>
          </div>
        )}

        {view === 'review' && lastSessionResult && (
          <div className="max-w-4xl mx-auto space-y-14 animate-fadeIn py-12 px-2 pb-48">
            <header className="text-center space-y-10">
              <div className={`w-44 h-44 md:w-56 md:h-56 rounded-[5rem] mx-auto flex flex-col items-center justify-center font-black ${lastSessionResult.accuracy >= 60 ? themeClasses.bg + ' text-white shadow-3xl' : 'bg-rose-500 text-white shadow-3xl shadow-rose-200'}`}>
                <span className="text-7xl md:text-8xl">{Math.round(lastSessionResult.accuracy)}%</span>
                <span className="text-[11px] uppercase opacity-70 mt-3 tracking-widest font-black">Successo</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 italic tracking-tighter">Referto per Alice 🐾</h2>
              <div className="flex justify-center gap-5">
                 <button onClick={() => setView('dashboard')} className="px-14 py-6 bg-gray-900 text-white rounded-[2.5rem] font-black text-xs uppercase shadow-xl">HOME</button>
                 <button onClick={() => setView('study')} className={`px-14 py-6 ${themeClasses.bg} text-white rounded-[2.5rem] font-black text-xs uppercase shadow-xl`}>LIBRERIA</button>
              </div>
            </header>
            
            <div className="space-y-12">
              {lastSessionResult.details?.map((item, idx) => {
                const aiTitle = AI_FEEDBACK_TITLES[Math.floor(Math.random() * AI_FEEDBACK_TITLES.length)];
                return (
                  <div key={idx} className={`p-12 md:p-16 rounded-[4.5rem] bg-white border-2 ${item.selected === item.q.correctIndex ? 'border-emerald-100 shadow-xl' : 'border-rose-100 shadow-xl'} relative`}>
                    <p className="text-2xl md:text-3xl font-black text-gray-900 mb-12 leading-tight italic tracking-tight">{item.q.question}</p>
                    <div className="space-y-4 mb-14">
                       {item.q.options.map((opt: string, i: number) => (
                         <div key={i} className={`p-6 rounded-[1.5rem] text-sm md:text-base font-bold flex items-center gap-6 ${i === item.q.correctIndex ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : i === item.selected ? 'bg-rose-50 text-rose-800 border border-rose-100' : 'bg-gray-50 text-gray-400 opacity-60'}`}>
                           <span className="w-10 h-10 rounded-2xl bg-white/50 flex items-center justify-center font-black text-lg shadow-sm">{String.fromCharCode(65+i)}</span>
                           {opt}
                         </div>
                       ))}
                    </div>
                    <div className={`${item.selected === item.q.correctIndex ? 'bg-emerald-50/50' : 'bg-rose-50/50'} p-10 rounded-[3.5rem] border border-gray-100 shadow-inner italic text-sm md:text-base text-gray-700 leading-relaxed`}>
                      <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 ${item.selected === item.q.correctIndex ? 'text-emerald-600' : 'text-rose-600'}`}>{aiTitle}</p>
                      {item.q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-fadeIn">
            <h2 className="text-5xl font-black text-gray-900 italic tracking-tighter">Agenda Abivet</h2>
            <StudyCalendar 
              reminders={reminders} history={history} badges={badges}
              onAddReminder={(r) => setReminders(prev => [...prev, { ...r, id: Math.random().toString() }])}
              onDeleteReminder={(id) => setReminders(prev => prev.filter(r => r.id !== id))}
              onToggleReminder={(id) => setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r))}
            />
          </div>
        )}

        {view === 'study' && (
          <div className="max-w-6xl mx-auto space-y-12 animate-fadeIn pb-16">
            <h2 className="text-5xl font-black text-gray-900 italic tracking-tighter leading-none">Libreria Moduli</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
               {allSubj.map(s => {
                 const cardCount = cards.filter(c => c.subject === s).length;
                 const quizCount = quizDB.filter(q => q.subject === s).length;
                 const b = badges.find(x => x.subject === s);
                 return (
                   <div key={s} className={`p-10 rounded-[4rem] border-2 transition-all flex flex-col gap-10 shadow-sm hover:shadow-2xl bg-white ${themeClasses.border} border-opacity-10 hover:border-opacity-100`}>
                      <div className="flex justify-between items-start">
                        <p className="text-2xl font-black leading-tight flex-1 pr-6">{s}</p>
                        <span className="text-5xl">{SUBJECT_ICONS[s] || "📁"}</span>
                      </div>
                      <div className="mt-auto space-y-6">
                        <div className="flex justify-between items-center border-t pt-6">
                           <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{cardCount + quizCount} Contenuti</span>
                           {b && <span className="text-[10px] font-black text-emerald-500 uppercase">Expert 🦴</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => startFlashcardSession(s)} className={`py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest ${cardCount > 0 ? themeClasses.bg + ' text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Cards</button>
                          <button onClick={() => startQuizSession(s)} className={`py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest ${quizCount > 0 ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Quiz</button>
                        </div>
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
            <h2 className="text-5xl font-black text-gray-900 italic tracking-tighter">Registro Referti</h2>
            <div className="bg-white rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <tr><th className="px-12 py-10">Data</th><th className="px-12 py-10">Soggetto</th><th className="px-12 py-10 text-right">Esito</th></tr>
                    </thead>
                    <tbody className="divide-y text-xs font-bold">
                       {history.map(res => (
                         <tr key={res.id} onClick={() => { setLastSessionResult(res); setView('review'); }} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                            <td className="px-12 py-8 text-gray-400">{new Date(res.date).toLocaleDateString()}</td>
                            <td className="px-12 py-8 text-gray-900 group-hover:text-emerald-600 transition-colors text-sm font-black">{res.subject} ({res.type})</td>
                            <td className={`px-12 py-8 text-right text-3xl font-black ${res.accuracy >= 60 ? themeClasses.text : 'text-rose-500'}`}>{Math.round(res.accuracy)}%</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

      </main>

      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-white/95 backdrop-blur-3xl border border-gray-100 rounded-[3rem] flex justify-around items-center p-6 z-40 shadow-2xl">
        <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? themeClasses.text : 'text-gray-300'}><ICONS.Dashboard /></button>
        <button onClick={() => setView('study')} className={view === 'study' ? themeClasses.text : 'text-gray-300'}><ICONS.Study /></button>
        <button onClick={() => setView('badges')} className={view === 'badges' ? themeClasses.text : 'text-gray-300'}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <button onClick={() => setView('settings')} className={view === 'settings' ? themeClasses.text : 'text-gray-300'}><svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
      </nav>

      {showGeneralTestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-xl rounded-[6rem] p-16 md:p-24 shadow-3xl text-center space-y-16 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-4 ${showGeneralTestModal === '1' ? 'bg-amber-400' : showGeneralTestModal === '2' ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
            <div className="space-y-6">
               <h4 className="text-6xl md:text-7xl font-black text-gray-900 tracking-tighter italic leading-none">
                {showGeneralTestModal === '1' ? "ESAME PRIMO ANNO" : showGeneralTestModal === '2' ? "ESAME SECONDO ANNO" : "GRAN FINALE ABIVET"}
               </h4>
               <p className="text-gray-400 font-bold text-xl md:text-2xl">Alice, sei pronta? Todo e i suoi amici sono pronti a giudicare il tuo fiuto clinico!</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <button onClick={() => { startQuizSession('Tutto', showGeneralTestModal); setShowGeneralTestModal(null); }} className={`${showGeneralTestModal === '1' ? 'bg-amber-500' : showGeneralTestModal === '2' ? 'bg-blue-500' : 'bg-emerald-500'} text-white py-12 rounded-[3.5rem] font-black text-3xl shadow-2xl uppercase tracking-tighter`}>🦴 INIZIA 🐾</button>
              <button onClick={() => setShowGeneralTestModal(null)} className="text-gray-400 font-black text-[10px] uppercase tracking-[0.4em]">Non ancora Alice!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
