import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';

export const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);

/**
 * Get a generative model instance.
 * Defaults to the model specified in env (GEMINI_MODEL).
 */
export function getGeminiModel(model?: string) {
  return gemini.getGenerativeModel({ model: model ?? env.GEMINI_MODEL });
}
