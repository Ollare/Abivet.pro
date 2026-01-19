
import React, { useState } from 'react';
import { StudyReminder, ABIVET_SUBJECTS, Year, TestResult, Badge } from '../types';

interface StudyCalendarProps {
  reminders: StudyReminder[];
  history: TestResult[];
  badges: Badge[];
  onAddReminder: (reminder: Omit<StudyReminder, 'id'>) => void;
  onDeleteReminder: (id: string) => void;
  onToggleReminder: (id: string) => void;
}

export const StudyCalendar: React.FC<StudyCalendarProps> = ({ 
  reminders, history, badges, onAddReminder, onDeleteReminder, onToggleReminder 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState(ABIVET_SUBJECTS[Year.First][0]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const formatDay = (day: number) => {
    const d = day.toString().padStart(2, '0');
    const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    return `${currentDate.getFullYear()}-${m}-${d}`;
  };

  const allSubjects = [...ABIVET_SUBJECTS[Year.First], ...ABIVET_SUBJECTS[Year.Second]];

  return (
    <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-[#f4f7ed]/50">
        <h3 className="text-xl md:text-2xl font-black text-gray-800 tracking-tighter">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center bg-white hover:bg-[#f4f7ed] rounded-xl transition-colors border border-gray-200 shadow-sm">&larr;</button>
          <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center bg-white hover:bg-[#f4f7ed] rounded-xl transition-colors border border-gray-200 shadow-sm">&rarr;</button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center py-4 bg-gray-50/30 border-b border-gray-50">
        {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(d => (
          <span key={d} className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 p-2 md:p-6 gap-2 flex-1 overflow-y-auto">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDay(day);
          
          const dayTests = history.filter(h => {
            const hDate = new Date(h.date).toISOString().split('T')[0];
            return hDate === dateStr;
          });
          const dayBadges = badges.filter(b => {
            const bDate = new Date(b.earnedDate).toISOString().split('T')[0];
            return bDate === dateStr;
          });
          const dayAccuracy = dayTests.length > 0
            ? Math.round(dayTests.reduce((a, b) => a + b.accuracy, 0) / dayTests.length)
            : null;

          const isSelected = selectedDay === dateStr;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div 
              key={day}
              onClick={() => setSelectedDay(dateStr)}
              className={`min-h-[80px] md:min-h-[120px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-start relative overflow-hidden ${isSelected ? 'border-[#5c871c] bg-[#f4f7ed] ring-2 ring-[#5c871c]/10' : 'border-gray-50 hover:border-[#5c871c]/20 hover:bg-gray-50'}`}
            >
              <span className={`text-[10px] md:text-sm font-black mb-1 ${isToday ? 'bg-[#5c871c] text-white w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-xl shadow-md' : 'text-gray-400'}`}>
                {day}
              </span>
              
              <div className="flex flex-wrap justify-center gap-1 mt-1">
                 {dayBadges.map(b => (
                   <span key={b.id} title={b.subject} className="text-lg md:text-2xl animate-bounce">🏆</span>
                 ))}
              </div>

              {dayAccuracy !== null && (
                <div className={`mt-auto text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-full ${dayAccuracy >= 60 ? 'text-[#5c871c] bg-[#f4f7ed]' : 'text-rose-500 bg-rose-100/50'}`}>
                  {dayAccuracy}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="p-8 md:p-12 bg-gray-50 border-t border-gray-100 animate-fadeIn space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 space-y-3 w-full">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pianifica per il: {selectedDay}</label>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-bold focus:ring-4 focus:ring-[#5c871c]/10 outline-none bg-white">
                {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={() => onAddReminder({ date: selectedDay, subject: selectedSubject, completed: false })} className="w-full md:w-auto bg-[#5c871c] text-white px-10 py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all uppercase tracking-widest">Pianifica 🦴</button>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">I tuoi obiettivi:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {reminders.filter(r => r.date === selectedDay).map(r => (
                 <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm group">
                   <div className="flex items-center gap-4">
                     <input type="checkbox" checked={r.completed} onChange={() => onToggleReminder(r.id)} className="w-5 h-5 text-[#5c871c] rounded-lg border-gray-300 focus:ring-[#5c871c]" />
                     <span className={`text-sm font-black ${r.completed ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{r.subject}</span>
                   </div>
                   <button onClick={() => onDeleteReminder(r.id)} className="text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </button>
                 </div>
               ))}
               {badges.filter(b => new Date(b.earnedDate).toISOString().split('T')[0] === selectedDay).map(b => (
                 <div key={b.id} className="bg-[#f4f7ed] p-5 rounded-2xl border border-[#5c871c]/20 flex items-center gap-4 shadow-sm">
                   <span className="text-3xl">🏆</span>
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black text-[#5c871c] uppercase tracking-widest leading-none mb-1">Badge Conquistato</span>
                     <span className="text-sm font-black text-gray-800">{b.subject}</span>
                   </div>
                 </div>
               ))}
            </div>
            {reminders.filter(r => r.date === selectedDay).length === 0 && badges.filter(b => new Date(b.earnedDate).toISOString().split('T')[0] === selectedDay).length === 0 && (
              <p className="text-xs text-gray-400 italic">Nessun evento per oggi Alice! 🐾</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
