// Level 1 of the website (no back office): set ADMIN_ENABLED=false and redeploy.
// /admin then returns 404 and quote requests rely on email (RESEND_API_KEY).
export const adminEnabled = process.env.ADMIN_ENABLED !== "false";
