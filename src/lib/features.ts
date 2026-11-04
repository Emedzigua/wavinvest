// Level 1 of the website (no back office): set ADMIN_ENABLED=false and redeploy.
// /admin then returns 404 and quote requests rely on email (RESEND_API_KEY).
export const adminEnabled = process.env.ADMIN_ENABLED !== "false";

// Can a quote request reach anyone? Mirrors the checks in submitQuote.
const emailReady = !!process.env.RESEND_API_KEY;
const databaseReady = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.QUOTE_FORM_SECRET;
export const quoteFormReady = adminEnabled ? emailReady || databaseReady : emailReady;
