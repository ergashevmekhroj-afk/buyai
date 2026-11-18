// The four agents as characters. Avatar colour is also used for their name on the home page.
// voice: how each agent sounds when you press 🔊 on its card.
//   uz / en = VoiceLab voice id. For uz use only voices marked "native standard Uzbek foundation";
//             others (e.g. the default one) read Uzbek with an English accent.
//   (from the "voices" list of our voice function; no Russian voices there yet).
//   pitch   = >1 higher (younger), <1 deeper (older). Done in the browser, so it costs nothing.
//   rate    = speaking speed.
export const AGENTS = [
  { n: 1, img: "/img/agents/mirzo.svg", color: "#2f56b0",        // Mirzo: the scribe (Planner): young, a bit childish
    voice: { uz: "voice_be56058a-8f15-48bb-904b-4fe92531d5b1", en: "voice_ba626fc6-18c5-408f-8376-d49b95047bd7", pitch: 1.18, rate: 1.08 } },
  { n: 2, img: "/img/agents/dallol.svg", color: "#d07a0c",       // Dallol: the bazaar broker (Price Scout): quick street talker
    voice: { uz: "voice_5e592ada-eca8-42e3-98fa-469c1c8fc999", en: "voice_oUhQK9VMv-QO8w17IELbSGKF", pitch: 1.0, rate: 1.12 } },
  { n: 3, img: "/img/agents/tarozibon.svg", color: "#7b4ea3",    // Tarozibon ota: keeper of the scales (Market Analyst): old, slow, deep
    voice: { uz: "voice_ba303813-3023-48aa-a454-4b5705669d35", en: "voice_4lA0S3282v3UoEBmpxOApz6w", pitch: 0.88, rate: 0.88 } },
  { n: 4, img: "/img/agents/xazinachi.svg", color: "#12855a",    // Xazinachi opa: the treasurer (Finance Advisor): calm woman
    voice: { uz: "voice_2785aabd-21b5-4cc7-9845-2230186ef7d9", en: "voice_Xqxok0jKVM__CT74ptlRc_w0", pitch: 1.0, rate: 1.0, female: true } },
];

// The voice that reads the final plan (🔊 O'qib berish): Madina (native Uzbek) / Maya (English).
export const NARRATOR = { uz: "voice_4ef06e6b-2229-4023-ad66-c2a7a2b736ff", en: "voice_951965ee-7f84-4e74-b93a-1c30c03ef21a", pitch: 1, rate: 1, female: true };
