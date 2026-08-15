import json
import os
import sys
from faster_whisper import WhisperModel

model = WhisperModel(os.environ.get("WHISPER_MODEL", "large-v3"), device=os.environ.get("WHISPER_DEVICE", "cpu"), compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"))
segments, info = model.transcribe(sys.argv[1], word_timestamps=True, vad_filter=True)
result = {
    "language": info.language,
    "languageProbability": float(info.language_probability),
    "segments": [
        {
            "text": segment.text.strip(),
            "startTime": float(segment.start),
            "endTime": float(segment.end),
            "confidence": None,
        }
        for segment in segments
    ],
}
print(json.dumps(result))
