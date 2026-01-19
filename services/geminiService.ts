
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, Year, MultipleChoiceQuestion, DETAILED_SUBJECTS, ABIVET_SUBJECTS } from "../types";

const TODO_AI_PERSONA = `Sei Todo.AI, un Jack Russel Terrier assistente tecnico veterinario senior Abivet.
Il tuo tono è professionale, asciutto e clinico.

REGOLE DI GENERAZIONE:
1. Devi attenerti rigorosamente allo standard clinico Abivet.
2. Flashcard: Domanda e Risposta tecnica classica (NO risposta multipla). Suggerimento obbligatorio.
3. Quiz: ESATTAMENTE 5 opzioni di risposta per ogni domanda.
4. Ogni spiegazione deve essere profonda e basata su protocolli Abivet.
5. Includi sempre i moduli di "Procedura infermieristiche" e "Procedura infermieristiche di base" negli esami generali.
6. Copri in modo omogeneo TUTTI i sottoargomenti forniti.`;

export const generateFlashcards = async (
  subject: string,
  year: Year,
  existingConcepts: string[] = [],
  count: number = 20
): Promise<Flashcard[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const subTopics = DETAILED_SUBJECTS[subject] || "";
  const prompt = `MODULO: ${subject} (${year}). TEMI: ${subTopics}. Genera ${count} flashcard tecniche (Domanda/Risposta). JSON format.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
            concept: { type: Type.STRING, description: "Parola chiave o suggerimento breve." },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING, description: "Focus tecnico Todo.AI." },
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
  existingQuestions: string[] = [],
  count: number = 20
): Promise<MultipleChoiceQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const subTopics = DETAILED_SUBJECTS[subject] || "";
  const prompt = `MODULO: ${subject} (${year}). TEMI: ${subTopics}. Genera ${count} quiz a 5 opzioni per lo standard Abivet. JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Deve contenere esattamente 5 opzioni." },
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let subjects: string[] = type === '1' ? ABIVET_SUBJECTS[Year.First] : [...ABIVET_SUBJECTS[Year.First], ...ABIVET_SUBJECTS[Year.Second]];

  const detailedMapString = subjects.map(s => `[MODULO: ${s}, TEMI: ${DETAILED_SUBJECTS[s]}]`).join('\n');
  const prompt = `Genera un esame bilanciato di ${totalQuestions} domande standard Abivet.
  MAPPATURA MODULI: ${detailedMapString}
  REGOLA: Inserisci almeno 2-3 domande per OGNI modulo citato (per esame da 50 Q) o 4-5 per l'esame da 100 Q. 
  TUTTI i quiz devono avere 5 opzioni. JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
