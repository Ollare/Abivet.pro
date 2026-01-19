
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
  points?: number;
  details?: any[];
}

export const DETAILED_SUBJECTS: Record<string, string> = {
  // Primo Anno
  "Zoologia": "Evoluzione e sistematica. I regni animali. Organismi unicellulari, Piante, Sviluppo embrionale, Vermi, Molluschi, Echinodermi, Artropodi, Cordati, vertebrati, anfibi, rettili, uccelli, mammiferi, primati, Lamarck, Darwin, selezione naturale, genetica.",
  "Zootecnia e Zoognostica": "Metodi allevamento, alimentazione e riproduzione. Razze latte e carne. Ovini (lana, distribuzione). Equini, Suini. Zoognostica cane e gatto. Comportamento riproduttivo, Gestazione e parto.",
  "Chimica, biochimica e chimica clinica": "Atomo, Sistema periodico, Molecole, Legami, Reazioni, pH. Chimica organica: idrocarburi, gruppi funzionali. Biochimica: glucidi, lipidi, protidi, acidi nucleici, enzimi, vitamine. Metabolismo: ATP, Glicolisi, Ciclo di Krebs, fosforilazione ossidativa, gluconeogenesi, grassi e proteine. Chimica clinica.",
  "Biologia": "La cellula, autotrofi ed eterotrofi. Membrana cellulare, matrice citoplasmatica, mitocondri, nucleo, cromosomi. Ciclo cellulare e mitosi. Riproduzione sessuata e meiosi. Tessuti epiteliali e connettivi.",
  "Sicurezza": "Legislazione, Responsabilità datore/lavoratore. Rischio biologico, fisico, traumatico, movimentazione carichi. Incendi, farmaci, radiologia, laboratorio. Malattie zoonosiche. DPI.",
  "Procedura infermieristiche di base": "Unità di misura, matematica applicata, soluzioni e diluizioni. Materiale di uso comune. Contenimento cane e gatto. Vie di somministrazione. Fleboclisi (materiali, calcoli). Infezioni, pulizia, disinfezione, asepsi. Gestione paziente ospedalizzato e immobilizzato.",
  "Anatomia e Fisiologia 1": "Citologia e istologia. Tegumentario e termoregolazione. Apparato locomotore (scheletrico e muscoli). Sistema endocrino. Sistema nervoso centrale e periferico. Organi di senso.",
  "Anatomia e Fisiologia 2": "Apparato circolatorio, sistema immunitario, sistema urinario, apparato respiratorio, apparato digerente, apparato genitale.",
  "Ippologia": "Segnalamento e origini, Etologia del cavallo, Anatomia e fisiologia, Patologia Equina, Discipline sportive equestri.",
  "Segreteria e gestione pratica": "IVA, Fattura commerciale, Strumenti di pagamento, Prima nota cassa/banca, Gestione dati clientela, Libri contabili, Corrispondenza, Pratiche assicurative, Inventario, Gestione appuntamenti e telefonate.",
  "Animali esotici": "Gestione e medicina di: coniglio, cavia, criceto, furetto, riccio, tartarughe, sauri, pappagalli e uccelli da voliera.",
  "Legislazione": "Compiti e funzioni veterinarie, Figure europee, Aspetti legali, Codice deontologico, Malattie denunciabili, Polizia veterinaria, Salvaguardia ambientale.",
  "Medicine NON convenzionali": "Salute olistica, Omeopatia (legge dei simili), Energia Vitale, Fitoterapia, Fiori di Bach, Kennel Remedy, Medicina cinese e meridiani energetici (Agopuntura).",
  
  // Secondo Anno
  "Patologia generale": "Definizioni di malattia, omeostasi, agenti eziologici. Microrganismi. Immunologia, Infiammazione, Tumori. Ricambio idrico, termoregolazione, equilibrio acido base, Shock, Processi riparativi.",
  "Farmacologia": "Forme farmaceutiche, vie somministrazione, calcoli. Farmacocinetica (assorbimento, escrezione). Effetti collaterali. SNC e sistema autonomo. Chemioterapici, antibiotici, FANS, diuretici, vaccini.",
  "Patologia medica": "Apparato urinario, cardiocircolatorio, respiratorio, endocrino, digerente, dermatologia.",
  "Malattie infettive e parassitarie": "Principali agenti eziologici, epidemiologia, profilassi e clinica delle zoonosi e malattie infettive animali.",
  "Alimentazione di animali piccoli e grandi": "Classificazione alimenti, Microbromi organici/inorganici, Utilizzazione energetica, Razione alimentare, Foraggi, Alimentazione bovini/ovini/equini/suini, Dietetica clinica cane e gatto.",
  "Procedura infermieristiche": "Parametri vitali, Anestesiologia e monitoraggio. Fluidoterapia. Pronto soccorso (GDV, emorragie, fratture). Bendaggi. Alimentazione enterale/parenterale. Assistenza chirurgica. Radiologia (manutenzione, proiezioni). Igiene dentale. RCP e terapia intensiva. Laboratorio e medicina trasfusionale.",
  "Legislazione dei Centri di Recupero Fauna Selvatica": "Protocolli sanitari, prevenzione zoonosi, DPI. Triage e stabilizzazione fauna. Contenimento e alimentazione di rettili, uccelli e mammiferi selvatici. Coprologia e riabilitazione pre-rilascio.",
  "Inglese": "Descrizione clinica di animali ed eventi. Domande formali/informali. Testi scientifici e divulgativi veterinari. Istruzioni e direttive."
};

export const ABIVET_SUBJECTS = {
  [Year.First]: [
    "Zoologia", "Zootecnia e Zoognostica", "Chimica, biochimica e chimica clinica", "Biologia", "Sicurezza",
    "Procedura infermieristiche di base", "Anatomia e Fisiologia 1", "Anatomia e Fisiologia 2",
    "Ippologia", "Segreteria e gestione pratica", "Animali esotici", "Legislazione", "Medicine NON convenzionali"
  ],
  [Year.Second]: [
    "Patologia generale", "Farmacologia", "Patologia medica", "Malattie infettive e parassitarie",
    "Alimentazione di animali piccoli e grandi", "Procedura infermieristiche",
    "Legislazione dei Centri di Recupero Fauna Selvatica", "Inglese"
  ]
};

export const SUBJECT_ICONS: Record<string, string> = {
  "Zoologia": "🦁",
  "Zootecnia e Zoognostica": "🦴",
  "Chimica, biochimica e chimica clinica": "🧪",
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

export type AppView = 'dashboard' | 'study' | 'generate' | 'history' | 'session' | 'calendar' | 'quiz_session' | 'review' | 'badges';
