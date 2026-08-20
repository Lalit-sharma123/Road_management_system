/**
 * Audio Alarm Synthesizer & Browser Notification Engine for High-Priority Stolen Vehicle Alerts
 */

class StolenAlertAudio {
  private audioCtx: AudioContext | null = null;

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Plays a distinct high-urgency two-tone police / security alert sound
   */
  public playAlarmSound() {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Pulse high-frequency alarm tones
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.setValueAtTime(659.25, now + 0.15); // E5
      osc1.frequency.setValueAtTime(880, now + 0.30);
      osc1.frequency.setValueAtTime(659.25, now + 0.45);
      osc1.frequency.setValueAtTime(987.77, now + 0.60); // B5

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(329.63, now + 0.15);
      osc2.frequency.setValueAtTime(440, now + 0.30);
      osc2.frequency.setValueAtTime(329.63, now + 0.45);
      osc2.frequency.setValueAtTime(493.88, now + 0.60);

      // Volume envelope
      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gainNode.gain.setValueAtTime(0.25, now + 0.75);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.0);
      osc2.stop(now + 1.0);
    } catch (e) {
      console.warn('Audio alarm synthesis prevented or unsupported:', e);
    }
  }

  /**
   * Dispatches standard HTML5 Browser Desktop Notification
   */
  public triggerBrowserNotification(plate: string, location: string, fir: string) {
    try {
      if (!('Notification' in window)) return;

      if (Notification.permission === 'granted') {
        new Notification('🚨 STOLEN VEHICLE DETECTED', {
          body: `Plate: ${plate}\nLocation: ${location}\nFIR: ${fir || 'Police Record'}`,
          icon: '/favicon.ico',
          tag: `stolen-${plate}`
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('🚨 STOLEN VEHICLE DETECTED', {
              body: `Plate: ${plate}\nLocation: ${location}`,
              tag: `stolen-${plate}`
            });
          }
        });
      }
    } catch (e) {
      console.warn('Browser notification trigger:', e);
    }
  }
}

export const stolenAlertAudio = new StolenAlertAudio();
