
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, Year, MultipleChoiceQuestion, DETAILED_SUBJECTS, ABIVET_SUBJECTS } from "../types";

const TODO_AI_PERSONA = `Sei Todo.AI, un assistente tecnico veterinario senior Abivet.
Il tuo tono è professionale, asciutto e clinico.

REGOLE DI GENERAZIONE:
1. Devi attenerti rigorosamente allo standard clinico Abivet.
2. Quiz: ESATTAMENTE 5 opzioni di risposta.
3. Flashcard: Formato puramente clinico (Domanda e Risposta). NON usare risposte multiple per le flashcard.
4. Spiegazioni: OBBLIGATORIE, basate su protocolli Abivet originali.
5. Esami Generali: Copri in modo omogeneo TUTTI i moduli forniti.
6. Invia ESATTAMENTE il numero di domande richiesto in formato JSON valido.
7. DE-DUPLICAZIONE: Evita argomenti, domande o concetti presenti nella lista di esclusione fornita.`;

const getAIClient = () => {
  // Nota: Il sistema inietta automaticamente la chiave corretta in process.env.API_KEY
  const key = process.env.API_KEY;
  if (!key) throw new Error("Chiave API non configurata nel sistema.");
  return new GoogleGenAI({ apiKey: key });
};

const MODEL_NAME = 'gemini-2.5-flash-lite';

export const generateFlashcards = async (
  subject: string,
  year: Year,
  excludeList: string[] = [],
  count: number = 10
): Promise<Flashcard[]> => {
  const ai = getAIClient();
  const subTopics = DETAILED_SUBJECTS[subject] || "";
  const exclusionContext = excludeList.length > 0 
    ? `\nNON REPLICARE I SEGUENTI CONCETTI: ${excludeList.join(", ")}` 
    : "";
  
  const prompt = `MODULO: ${subject} (${year}). TEMI: ${subTopics}. Genera ${count} flashcard tecniche inedite (Domanda e Risposta).${exclusionContext}\nRestituisci solo JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: TODO_AI_PERSONA,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            concept: { type: Type.STRING },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['Facile', 'Media', 'Difficile'] },
          },
          required: ["question", "concept", "answer", "difficulty", "explanation"],
        },
      },
    },
  });

  const cardsJson = JSON.parse(response.text || "[]");
  return cardsJson.map((card: any) => ({
    ...card,
    id: Math.random().toString(36).substr(2, 9),
    subject,
    year,
    createdAt: Date.now(),
  }));
};

export const generateQuizQuestions = async (
  subject: string,
  year: Year,
  excludeList: string[] = [],
  count: number = 10
): Promise<MultipleChoiceQuestion[]> => {
  const ai = getAIClient();
  const subTopics = DETAILED_SUBJECTS[subject] || "";
  const exclusionContext = excludeList.length > 0 
    ? `\nNON REPLICARE I SEGUENTI QUIZ: ${excludeList.join(", ")}` 
    : "";
  
  const prompt = `MODULO: ${subject} (${year}). TEMI: ${subTopics}. Genera ${count} quiz a scelta multipla (5 opzioni) inediti.${exclusionContext}\nRestituisci solo JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: TODO_AI_PERSONA,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['Facile', 'Media', 'Difficile'] },
          },
          required: ["question", "options", "correctIndex", "explanation", "difficulty"],
        },
      },
    },
  });

  const quizJson = JSON.parse(response.text || "[]");
  return quizJson.map((q: any) => ({
    ...q,
    id: Math.random().toString(36).substr(2, 9),
    subject,
    year,
  }));
};

export const generateBalancedExam = async (
  type: '1' | 'F',
  totalQuestions: number
): Promise<MultipleChoiceQuestion[]> => {
  const ai = getAIClient();
  let subjects: string[] = type === '1' ? ABIVET_SUBJECTS[Year.First] : [...ABIVET_SUBJECTS[Year.First], ...ABIVET_SUBJECTS[Year.Second]];
  const prompt = `Genera un esame clinico Abivet bilanciato di ${totalQuestions} domande a scelta multipla (5 opzioni). Materie: ${subjects.join(', ')}. Restituisci JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: TODO_AI_PERSONA,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['Facile', 'Media', 'Difficile'] },
            subject: { type: Type.STRING }
          },
          required: ["question", "options", "correctIndex", "explanation", "difficulty", "subject"],
        },
      },
    },
  });

  let quizJson = JSON.parse(response.text || "[]");
  if (quizJson.length > totalQuestions) quizJson = quizJson.slice(0, totalQuestions);

  return quizJson.map((q: any) => ({
    ...q,
    id: Math.random().toString(36).substr(2, 9),
    year: ABIVET_SUBJECTS[Year.First].includes(q.subject) ? Year.First : Year.Second,
  }));
};
