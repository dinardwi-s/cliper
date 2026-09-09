import { ServiceUnavailableException } from '@nestjs/common';
import { AiClipProvider, ClipSuggestion, TranscriptInput } from './ai-clip-provider';
import { parseSuggestions, prompt } from './openai.provider';

export class GeminiClipProvider implements AiClipProvider {
  async detectClips(segments: TranscriptInput[]): Promise<ClipSuggestion[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('Gemini API key is not configured');
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const transcript = segments.map((s) => `[${s.startTime.toFixed(2)}-${s.endTime.toFixed(2)}] ${s.text}`).join('\n');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }, systemInstruction: { parts: [{ text: prompt() }] }, contents: [{ role: 'user', parts: [{ text: transcript }] }] }) });
    if (!response.ok) throw new ServiceUnavailableException('Gemini analysis failed');
    const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return parseSuggestions(body.candidates?.[0]?.content?.parts?.[0]?.text, 'Gemini');
  }
}
