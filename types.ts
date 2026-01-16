
export enum Year {
  First = 'Primo Anno',
  Second = 'Secondo Anno'
}

export type Difficulty = 'Facile' | 'Media' | 'Difficile';

export interface Flashcard {
  id: string;
  subject: string;
  year: Year;
  question: string;
  concept: string;
  answer: string;
  explanation?: string;
  difficulty: Difficulty;
  createdAt: number;
}

export interface MultipleChoiceQuestion {
  id: string;
  subject: string;
  year: Year;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
}

export interface Badge {
  id: string;
  subject: string;
  icon: string;
  earnedDate: number;
}

export interface StudyReminder {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  subject: string;
  completed: boolean;
}

export interface TestResult {
  id: string;
  date: number; // Timestamp
  subject: string;
  type: 'Flashcard' | 'Quiz' | 'Esame Primo Anno' | 'Esame Secondo Anno' | 'Esame Finale';
  totalCards: number;
  correctAnswers: number;
  accuracy: number;
  details?: any[];
}

export const ABIVET_SUBJECTS = {
  [Year.First]: [
    "Zoologia", 
    "Zootecnia e Zoognostica", 
    "Chimica", 
    "Biologia", 
    "Sicurezza",
    "Procedura infermieristiche di base", 
    "Anatomia e Fisiologia 1",
    "Anatomia e Fisiologia 2",
    "Ippologia", 
    "Segreteria e gestione pratica", 
    "Animali esotici",
    "Legislazione", 
    "Medicine NON convenzionali"
  ],
  [Year.Second]: [
    "Patologia generale", 
    "Farmacologia", 
    "Patologia medica", 
    "Malattie infettive e parassitarie",
    "Alimentazione di animali piccoli e grandi", 
    "Procedura infermieristiche",
    "Legislazione dei Centri di Recupero Fauna Selvatica", 
    "Inglese"
  ]
};

// Dettagli specifici per l'AI per i moduli di Anatomia
export const SUBJECT_DETAILS: Record<string, string> = {
  "Anatomia e Fisiologia 1": "Citologia e istologia; Tegumentario e termoregolazione; apparato locomotore (scheletrico e muscoli); sistema endocrino; sistema nervoso centrale e periferico; organi di senso.",
  "Anatomia e Fisiologia 2": "Apparato circolatorio; sistema immunitario; sistema urinario; apparato respiratorio; apparato digerente; apparato genitale."
};

// Mappatura icone Badge per ogni materia
export const SUBJECT_ICONS: Record<string, string> = {
  "Zoologia": "🦁",
  "Zootecnia e Zoognostica": "🦴",
  "Chimica": "🧪",
  "Biologia": "🧬",
  "Sicurezza": "🛡️",
  "Procedura infermieristiche di base": "🩹",
  "Anatomia e Fisiologia 1": "🫀",
  "Anatomia e Fisiologia 2": "🧠",
  "Ippologia": "🐎",
  "Segreteria e gestione pratica": "📂",
  "Animali esotici": "🦎",
  "Legislazione": "⚖️",
  "Medicine NON convenzionali": "🌿",
  "Patologia generale": "🔬",
  "Farmacologia": "💊",
  "Patologia medica": "🩺",
  "Malattie infettive e parassitarie": "🦠",
  "Alimentazione di animali piccoli e grandi": "🥣",
  "Procedura infermieristiche": "💉",
  "Legislazione dei Centri di Recupero Fauna Selvatica": "🦅",
  "Inglese": "🇬🇧",
  "Tutto": "🏆"
};

export type ThemeColor = 'emerald' | 'blue' | 'indigo' | 'rose' | 'amber';

export type AppView = 'dashboard' | 'study' | 'generate' | 'history' | 'session' | 'calendar' | 'quiz_session' | 'review' | 'settings' | 'badges';
