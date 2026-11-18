// Voice in and out, in the current language.
// 1st choice: VoiceLab (Uzbek-first speech AI) through our server function "voice"
//             (the API key stays on the server).
// Fallback:   the browser's own speech recognition / speech synthesis.
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";
import { lang, LANGS } from "./i18n.js";

const VOICE_URL = SUPABASE_URL + "/functions/v1/voice";
const headers = { apikey: SUPABASE_KEY };
let serverVoice = null;   // null = not checked yet, true/false after the first check

async function serverAvailable() {
  if (serverVoice !== null) return serverVoice;
  try {
    const res = await fetch(VOICE_URL, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ mode: "ping" }) });
    serverVoice = res.ok;
  } catch { serverVoice = false; }
  return serverVoice;
}

// ---------------- speech -> text ----------------
// startListening() returns an object with stop(); onText(text) is called with the result.
export async function startListening({ onText, onState }) {
  if (await serverAvailable() && navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
    return recordAndTranscribe({ onText, onState });
  }
  return browserRecognition({ onText, onState });
}

async function recordAndTranscribe({ onText, onState }) {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { onState("denied"); return null; }
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    stream.getTracks().forEach((tr) => tr.stop());
    onState("working");
    try {
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "speech." + (blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"));
      form.append("language", lang);
      const res = await fetch(VOICE_URL, { method: "POST", headers, body: form });
      const out = await res.json();
      if (!res.ok || !out.text) throw new Error(out.error || "no text");
      onText(out.text);
      onState("idle");
    } catch { onState("error"); }
  };
  rec.start();
  onState("listening");
  const timer = setTimeout(() => rec.state === "recording" && rec.stop(), 20000);   // max 20 s
  return { stop() { clearTimeout(timer); if (rec.state === "recording") rec.stop(); } };
}

function browserRecognition({ onText, onState }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onState("unsupported"); return null; }
  const r = new SR();
  r.lang = LANGS[lang].speech;
  r.interimResults = false;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onerror = (e) => onState(e.error === "not-allowed" ? "denied" : "error");
  r.onend = () => onState("idle");
  r.start();
  onState("listening");
  return { stop() { r.stop(); } };
}

// ---------------- text -> speech ----------------
let audio = null;
export function stopSpeaking() {
  if (audio) { audio.pause(); audio = null; }
  window.speechSynthesis?.cancel();
}

// character (optional) = an agent's voice from agentsInfo.js: { uz, en, pitch, rate, female }.
// VoiceLab has no pitch setting, so we play its audio faster/slower WITHOUT keeping the pitch:
// pitch 1.18 = higher, younger voice. We ask VoiceLab for speed rate/pitch so the final speed is "rate".
const audioCache = new Map();   // same text + same voice = play again without spending VoiceLab credits

export async function speak(text, onEnd = () => {}, character = null) {
  stopSpeaking();
  if (!text) return;
  const pitch = character?.pitch ?? 1, rate = character?.rate ?? 1;
  const voiceId = character?.[lang];                     // no voice for this language -> browser voice
  if ((!character || voiceId) && await serverAvailable()) {
    try {
      const key = `${voiceId ?? "default"}|${lang}|${text}`;
      let blob = audioCache.get(key);
      if (!blob) {
        const res = await fetch(VOICE_URL, {
          method: "POST", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "tts", text: text.slice(0, 1500), language: lang, voice_id: voiceId, speed: +(rate / pitch).toFixed(2) }),
        });
        if (!res.ok || !(res.headers.get("content-type") || "").includes("audio")) throw new Error("no audio");
        blob = await res.blob();
        audioCache.set(key, blob);
      }
      const url = URL.createObjectURL(blob);
      audio = new Audio(url);
      audio.preservesPitch = false;                       // let playbackRate change the pitch too
      audio.playbackRate = pitch;
      audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
      await audio.play();
      return;
    } catch { /* fall back to the browser voice */ }
  }
  if (!window.speechSynthesis) { onEnd(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANGS[lang].speech;
  // Browsers have no Uzbek voice, and an English voice reads Uzbek with a heavy accent.
  // A Turkish (then Kazakh / Azerbaijani) voice pronounces Uzbek Latin letters much better, so we try those next.
  const all = speechSynthesis.getVoices();
  const langs = lang === "uz" ? ["uz", "tr", "kk", "az"] : [lang];
  const voices = langs.map((l) => all.filter((v) => v.lang?.toLowerCase().startsWith(l))).find((list) => list.length) ?? [];
  if (voices[0]) u.lang = voices[0].lang;
  // a woman's voice for Xazinachi opa if the browser has one (names like Milena, Samantha, "Female")
  const voice = (character?.female && voices.find((v) => /female|milena|samantha|karen|victoria|alena|katya|zira/i.test(v.name))) || voices[0];
  if (voice) u.voice = voice;
  u.pitch = Math.min(2, pitch * (character?.female && !voice?.name.match(/female|milena|samantha|karen|victoria|alena|katya|zira/i) ? 1.1 : 1));
  u.rate = rate;
  u.onend = onEnd;
  speechSynthesis.speak(u);
}
