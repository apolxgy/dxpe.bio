import { MUSIC } from "../content.js";

export function createAudio() {
  let el = null;
  let ctx = null;
  let wanted = false;

  function track() {
    if (!el) {
      el = new Audio();
      el.src = MUSIC;
      el.loop = true;
      el.preload = "none";
      el.volume = 0.72;
      el.crossOrigin = "anonymous";
      el.addEventListener("play", () => document.body.classList.add("is-audio"));
      el.addEventListener("pause", () => document.body.classList.remove("is-audio"));
      el.addEventListener("error", () => {
        if (wanted) setTimeout(() => el.load(), 900);
      });
    }
    return el;
  }

  function spark() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  async function play() {
    const a = track();
    try {
      await a.play();
      wanted = true;
      return true;
    } catch {
      wanted = true;
      return false;
    }
  }

  return {
    get isOn() {
      return Boolean(el) && !el.paused;
    },
    get wanted() {
      return wanted;
    },
    async toggle(next) {
      const want = next === undefined ? !(el && !el.paused) : next;
      if (want) return play();
      wanted = false;
      el?.pause();
      return false;
    },
    blip(freq = 620) {
      if (!this.isOn) return;
      const c = spark();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.8, now + 0.1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    },
    thud() {
      if (!this.isOn) return;
      const c = spark();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.45);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.62);
    },
    stamp() {
      if (!this.isOn) return;
      const c = spark();
      if (!c) return;
      const now = c.currentTime;

      const len = Math.floor(c.sampleRate * 0.09);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }

      const noise = c.createBufferSource();
      noise.buffer = buf;
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1750;
      const nGain = c.createGain();
      nGain.gain.setValueAtTime(0.16, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      noise.connect(hp).connect(nGain).connect(c.destination);
      noise.start(now);

      const body = c.createOscillator();
      const bGain = c.createGain();
      body.type = "triangle";
      body.frequency.setValueAtTime(196, now);
      body.frequency.exponentialRampToValueAtTime(74, now + 0.14);
      bGain.gain.setValueAtTime(0.11, now);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      body.connect(bGain).connect(c.destination);
      body.start(now);
      body.stop(now + 0.24);

      const tick = c.createOscillator();
      const tGain = c.createGain();
      tick.type = "sine";
      tick.frequency.setValueAtTime(1480, now + 0.05);
      tick.frequency.exponentialRampToValueAtTime(620, now + 0.14);
      tGain.gain.setValueAtTime(0, now);
      tGain.gain.linearRampToValueAtTime(0.05, now + 0.06);
      tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      tick.connect(tGain).connect(c.destination);
      tick.start(now + 0.05);
      tick.stop(now + 0.22);
    },
  };
}
