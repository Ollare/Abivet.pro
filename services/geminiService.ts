
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, Year, Difficulty, MultipleChoiceQuestion, SUBJECT_DETAILS } from "../types";

const TODO_AI_PERSONA = `Sei Todo.AI, un vivace e intelligentissimo Jack Russel Terrier assistente della studentessa Alice per il corso Abivet (Tecnico Veterinario). 
Il tuo tono è professionale, rigoroso e tecnico. Rivolgiti ad Alice per nome.

REGOLE DI RISPOSTA:
1. Usa solo conoscenze accademiche certificate Abivet o da paper scientifici.
2. Sii rigoroso: Todo deve spiegare la verità clinica basata sui protocolli tecnici.
3. UNICITÀ: Non generare mai domande o concetti identici a quelli già presenti nel database. Varia i casi clinici e i dettagli tecnici.`;

export const generateFlashcards = async (
  subject: string,
  year: Year,
  existingConcepts: string[] = [],
  count: number = 20
): Promise<Flashcard[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const details = SUBJECT_DETAILS[subject] || "";
  const prompt = `Genera ${count} flashcard accademiche Abivet per Alice su ${subject} (${year}). 
${details ? 'Il modulo deve concentrarsi specificamente su: ' + details : ''}
IMPORTANTE: Evita assolutamente concetti già trattati: ${existingConcepts.slice(-30).join(', ')}. 
REQUISITI:
1. Domanda: Tecnica e specifica.
2. Concetto: Termine chiave clinico.
3. Risposta: Accademica e completa.
4. Spiegazione: Todo.AI spiega l'importanza clinica.`;

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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const details = SUBJECT_DETAILS[subject] || "";
  const prompt = `Genera ${count} quiz d'esame a scelta multipla (5 opzioni) per Alice su ${subject} (${year}).
${details ? 'Il modulo deve concentrarsi specificamente su: ' + details : ''}
IMPORTANTE: Sii originale e non ripetere queste domande: ${existingQuestions.slice(-30).join(', ')}.
REQUISITI:
- Focus su protocolli clinici Abivet.
- Spiegazione rigorosa e tecnica.`;

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
