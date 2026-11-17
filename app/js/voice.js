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

export async function speak(text, onEnd = () => {}) {
  stopSpeaking();
  if (!text) return;
  if (await serverAvailable()) {
    try {
      const res = await fetch(VOICE_URL, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tts", text: text.slice(0, 1500), language: lang }),
      });
      if (res.ok && (res.headers.get("content-type") || "").includes("audio")) {
        const url = URL.createObjectURL(await res.blob());
        audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
        await audio.play();
        return;
      }
    } catch { /* fall back to the browser voice */ }
  }
  if (!window.speechSynthesis) { onEnd(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANGS[lang].speech;
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(lang));
  if (voice) u.voice = voice;
  u.onend = onEnd;
  speechSynthesis.speak(u);
}
