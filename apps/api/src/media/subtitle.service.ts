import { Injectable } from '@nestjs/common';

export interface SubtitleSegment { text: string; startTime: number; endTime: number }

@Injectable()
export class SubtitleService {
  toSrt(segments: SubtitleSegment[], clipStart: number, clipEnd: number): string {
    return segments.filter((segment) => segment.endTime > clipStart && segment.startTime < clipEnd).map((segment, index) => {
      const start = Math.max(segment.startTime, clipStart) - clipStart;
      const end = Math.min(segment.endTime, clipEnd) - clipStart;
      return `${index + 1}\n${this.timestamp(start)} --> ${this.timestamp(end)}\n${segment.text.trim()}\n`;
    }).join('\n');
  }

  toAss(segments: SubtitleSegment[], clipStart: number, clipEnd: number, wordHighlight = false): string {
    const events = segments.filter((segment) => segment.endTime > clipStart && segment.startTime < clipEnd).map((segment) => {
      const start = Math.max(segment.startTime, clipStart) - clipStart;
      const end = Math.min(segment.endTime, clipEnd) - clipStart;
      const text = wordHighlight ? segment.text.trim().split(/\s+/).map((word) => `{\\c&H00FFFF&}${this.escape(word)}{\\c&HFFFFFF&}`).join(' ') : this.escape(segment.text.trim());
      return `Dialogue: 0,${this.assTime(start)},${this.assTime(end)},TikTok,,0,0,0,,${text}`;
    }).join('\n');
    return `[Script Info]\nScriptType: v4.00+\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: TikTok,Arial,22,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,1,3,1,2,40,40,80,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events}`;
  }

  private timestamp(seconds: number): string { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = Math.floor(seconds % 60); const ms = Math.floor((seconds % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`; }
  private assTime(seconds: number): string { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`; }
  private escape(value: string): string { return value.replace(/[{}]/g, ''); }
}
