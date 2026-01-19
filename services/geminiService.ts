
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, Year, MultipleChoiceQuestion, DETAILED_SUBJECTS, ABIVET_SUBJECTS } from "../types";

const TODO_AI_PERSONA = `Sei Todo.AI, un assistente tecnico veterinario senior Abivet.
Il tuo tono è professionale, asciutto e clinico.

REGOLE DI GENERAZIONE:
1. Devi attenerti rigorosamente allo standard clinico Abivet.
2. Quiz: ESATTAMENTE 5 opzioni di risposta.
3. Spiegazioni: OBBLIGATORIE, basate su protocolli Abivet originali.
4. Esami Generali: Copri in modo omogeneo TUTTI i moduli forniti.
5. Invia ESATTAMENTE il numero di domande richiesto in formato JSON valido.`;

const getAIClient = () => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API_KEY missing");
  return new GoogleGenAI({ apiKey: key });
};

export const generateFlashcards = async (
  subject: string,
  year: Year,
  existingConcepts: string[] = [],
  count: number = 20
): Promise<Flashcard[]> => {
  const ai = getAIClient();
  const subTopics = DETAILED_SUBJECTS[subject] || "";
  const prompt = `MODULO: ${subject} (${year}). TEMI: ${subTopics}. Genera ${count} flashcard tecniche. JSON format.`;

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
  existingQuestions: string[] = [],
  count: number = 20
): Promise<MultipleChoiceQuestion[]> => {
  const ai = getAIClient();
  const subTopics = DETAILED_SUBJECTS[subject] || "";
  const prompt = `MODULO: ${subject} (${year}). TEMI: ${subTopics}. Genera ${count} quiz (5 opzioni). JSON.`;

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
  const prompt = `Genera un esame clinico Abivet di ${totalQuestions} domande (5 opzioni ciascuna). Bilancia equamente i moduli: ${subjects.join(', ')}. Restituisci JSON.`;

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
