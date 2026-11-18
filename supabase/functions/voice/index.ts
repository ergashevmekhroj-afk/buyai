// Supabase Edge Function "voice": speech in and out through VoiceLab (voicelab.uz),
// which is built for Uzbek and also speaks Russian and English.
// The key stays here (secret VOICELAB_API_KEY). Docs: https://docs.voicelab.uz/llms.txt
//
//   JSON {mode:"ping"}                          -> 200 if voice is configured (the app checks this first)
//   JSON {mode:"tts", text, language, voice?, speed?} -> audio/wav bytes
//        voice = 0..3 picks the agent's own voice (secret VOICELAB_VOICE_<LANG>_<n>, else the n-th listed voice)
//   JSON {mode:"voices", language}              -> [{id, name, description}] (to choose voices per agent)
//   multipart: audio=<file>, language=uz|ru|en  -> {text}
// Both VoiceLab jobs may finish later (HTTP 202), so we poll until they are done.

const API = "https://api.voicelab.uz";
const MODEL = "lison";                      // VoiceLab Lison: uz, ru, en
const LANGS = ["uz", "ru", "en"];
const MAX_WAIT_MS = 25000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// keys are plain ASCII (vlk_...); drop spaces, line breaks and invisible characters a copy-paste may add
const key = () => (Deno.env.get("VOICELAB_API_KEY") ?? "").replace(/[^\x21-\x7E]/g, "");
const auth = () => ({ Authorization: `Bearer ${key()}` });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// All voices VoiceLab offers for a language (cached)
const listCache: Record<string, { id: string; display_name?: string; description?: string }[]> = {};
async function listVoices(lang: string) {
  if (listCache[lang]) return listCache[lang];
  const res = await fetch(`${API}/v1/voices?language=${lang}&model_id=${MODEL}`, { headers: auth() });
  if (!res.ok) throw new Error(`voices ${res.status}`);
  const list = (await res.json()).data ?? [];
  if (!list.length) throw new Error(`no voice for ${lang}`);
  return (listCache[lang] = list);
}

// Voice per language (and per agent, n = 0..3). A secret wins: VOICELAB_VOICE_UZ_3 for agent 4 in Uzbek,
// or VOICELAB_VOICE_UZ for everyone. Otherwise the n-th voice VoiceLab lists (wraps around if fewer).
async function voiceFor(lang: string, n: number | null = null): Promise<string> {
  const L = lang.toUpperCase();
  const fixed = (n != null && Deno.env.get(`VOICELAB_VOICE_${L}_${n}`)) || Deno.env.get(`VOICELAB_VOICE_${L}`);
  if (fixed) return fixed;
  const list = await listVoices(lang);
  return list[(n ?? 0) % list.length].id;
}

async function textToSpeech(text: string, lang: string, n: number | null = null, speed = 1, voiceId: string | null = null): Promise<Response> {
  const res = await fetch(`${API}/v1/tts`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ text, language: lang, voice_id: voiceId ?? await voiceFor(lang, n), model_id: MODEL, speed }),
  });
  if (res.status === 200) return wav(await res.arrayBuffer());
  if (res.status !== 202) throw new Error(`tts ${res.status}: ${await res.text()}`);

  // still generating: poll the job, then download the finished audio (signed URL, no key)
  const job = await res.json();
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(1000);
    const poll = await fetch(`${API}${job.status_url}`, { headers: auth() });
    const st = await poll.json();
    if (st.status === "completed") return wav(await (await fetch(st.audio_url)).arrayBuffer());
    if (st.status === "failed") throw new Error(`tts failed: ${JSON.stringify(st.error)}`);
  }
  throw new Error("tts timeout");
}
const wav = (buf: ArrayBuffer) => new Response(buf, { headers: { ...CORS, "Content-Type": "audio/wav" } });

async function speechToText(audio: File, lang: string): Promise<string> {
  const form = new FormData();
  form.append("audio", audio, audio.name || "speech.webm");
  form.append("language", lang);
  form.append("include_speakers", "false");
  const res = await fetch(`${API}/v1/stt`, {
    method: "POST",
    headers: { ...auth(), "Idempotency-Key": crypto.randomUUID() },
    body: form,
  });
  if (res.status !== 202 && res.status !== 200) throw new Error(`stt ${res.status}: ${await res.text()}`);
  const { id } = await res.json();
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(800);
    const st = await (await fetch(`${API}/v1/stt/transcriptions/${id}`, { headers: auth() })).json();
    if (st.status === "completed") return String(st.transcript ?? "").trim();
    if (st.status === "failed") throw new Error(`stt failed: ${JSON.stringify(st.error)}`);
  }
  throw new Error("stt timeout");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!key()) return json({ error: "VOICELAB_API_KEY is not set" }, 503);

  try {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData();
      const audio = form.get("audio");
      const lang = LANGS.includes(String(form.get("language"))) ? String(form.get("language")) : "uz";
      if (!(audio instanceof File)) return json({ error: "audio missing" }, 400);
      if (audio.size > 10 * 1024 * 1024) return json({ error: "audio too large" }, 413);
      return json({ text: await speechToText(audio, lang) });
    }
    const body = await req.json();
    if (body.mode === "ping") return json({ ok: true });
    if (body.mode === "tts") {
      const text = String(body.text ?? "").trim().slice(0, 1500);   // 1 character = 1 credit
      const lang = LANGS.includes(body.language) ? body.language : "uz";
      if (!text) return json({ error: "empty text" }, 400);
      // the app may name an exact voice (each agent has its own, see web/src/agentsInfo.js)
      const voiceId = typeof body.voice_id === "string" && /^voice_[\w-]{4,60}$/.test(body.voice_id) ? body.voice_id : null;
      const n = [0, 1, 2, 3].includes(body.voice) ? body.voice : null;
      const speed = Math.min(2, Math.max(0.5, Number(body.speed) || 1));
      return await textToSpeech(text, lang, n, speed, voiceId);
    }
    if (body.mode === "voices") {
      const lang = LANGS.includes(body.language) ? body.language : "uz";
      return json((await listVoices(lang)).map((v) => ({ id: v.id, name: v.display_name, description: v.description })));
    }
    return json({ error: "unknown mode" }, 400);
  } catch (error) {
    return json({ error: String(error) }, 502);
  }
});
