import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface ClipSuggestion { title: string; startTime: number; endTime: number; score: number; hook: string; rationale: string }

@Injectable()
export class OpenAiService {
  async detectClips(segments: Array<{ text: string; startTime: number; endTime: number }>): Promise<ClipSuggestion[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('OpenAI API key is not configured');
    const transcript = segments.map((s) => `[${s.startTime.toFixed(2)}-${s.endTime.toFixed(2)}] ${s.text}`).join('\n');
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Find engaging short-video moments. Return JSON object {"clips":[{"title":string,"startTime":number,"endTime":number,"score":number,"hook":string,"rationale":string}]}. Select 3-10 non-overlapping clips, 15-90 seconds each. Scores 1-100. Use exact transcript timestamps.' }, { role: 'user', content: transcript }] }) });
    if (!response.ok) throw new ServiceUnavailableException('OpenAI analysis failed');
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    try {
      const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as { clips?: ClipSuggestion[] };
      return (parsed.clips ?? []).filter((clip) => this.valid(clip));
    } catch { throw new ServiceUnavailableException('OpenAI returned invalid clip suggestions'); }
  }

  private valid(clip: ClipSuggestion): boolean { return Boolean(clip.title && clip.hook && clip.rationale && clip.startTime >= 0 && clip.endTime > clip.startTime && clip.endTime - clip.startTime >= 15 && clip.endTime - clip.startTime <= 90 && clip.score >= 1 && clip.score <= 100); }
}
