import io
import wave
import struct
import base64
import math
from typing import Dict, Any


class DriverTTS:
    """
    Driver Assistance Text-To-Speech & Acoustic Warning Synthesizer.
    Generates real-time audio chime warning sound effects and structured speech payload.
    Provides web-compatible audio streams so warnings trigger instantaneously in browser dashboards.
    """

    def generate_warning_chime_wav(self, alert_level: str = "high") -> bytes:
        """
        Synthesize clean multi-tone acoustic warning chime as 16-bit PCM WAV audio.
        """
        sample_rate = 22050
        duration_sec = 0.4

        if alert_level == "critical":
            freq1, freq2 = 880.0, 1174.66  # A5 -> D6 Emergency Alert
        elif alert_level == "high":
            freq1, freq2 = 659.25, 880.0    # E5 -> A5 High Alert
        elif alert_level == "medium":
            freq1, freq2 = 523.25, 659.25   # C5 -> E5 Caution Chime
        else:
            freq1, freq2 = 440.0, 523.25    # A4 -> C5 Gentle Info

        num_samples = int(sample_rate * duration_sec)
        wav_buffer = io.BytesIO()

        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)

            samples = []
            for i in range(num_samples):
                t = i / sample_rate
                # Dual sine wave chime with smooth exponential decay envelope
                env = math.exp(-t * 5.0)
                tone = 0.5 * math.sin(2 * math.pi * freq1 * t) + 0.5 * math.sin(2 * math.pi * freq2 * t)
                sample_val = int(tone * env * 28000.0)
                samples.append(struct.pack('<h', max(-32767, min(32767, sample_val))))

            wav_file.writeframes(b''.join(samples))

        return wav_buffer.getvalue()

    def get_speech_payload(self, voice_message: str, alert_level: str = "high") -> Dict[str, Any]:
        """
        Build complete speech & acoustic chime payload for client audio engine.
        Includes base64 audio data URI for instant HTML5 playback.
        """
        wav_bytes = self.generate_warning_chime_wav(alert_level)
        b64_audio = base64.b64encode(wav_bytes).decode('utf-8')
        data_uri = f"data:audio/wav;base64,{b64_audio}"

        return {
            "text": voice_message,
            "alert_level": alert_level,
            "chime_audio_uri": data_uri,
            "speech_rate": 1.0 if alert_level in ["low", "medium"] else 1.15,
            "pitch": 1.0 if alert_level in ["low", "medium"] else 1.1
        }


# Global TTS Instance
driver_tts = DriverTTS()
