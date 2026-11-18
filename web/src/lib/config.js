// Public settings. The publishable key is meant to be in the browser: the database
// only allows reading, and writing goes through the post_offer function.
// The Claude API key is NOT here; it lives on the server (Supabase secret).
export const SUPABASE_URL = "https://gvffeagwuoaqbzmarqqf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Rd-twraa5DhZW4vIK0iNWw_YF_H0hIK";
export const AI_URL = SUPABASE_URL + "/functions/v1/ai";
export const AI_TIMEOUT_MS = 15000;   // explanation: after this we use the template text
export const PARSE_TIMEOUT_MS = 6000; // reading the order: after this we use the keyword parser (it is instant)

// Today's month for forecasts (forecast table starts at Nov 2026)
export const TODAY = new Date();
