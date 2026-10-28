import "server-only";
import webpush, { type PushSubscription } from "web-push";

export type PushMessage = { title: string; body: string; url: string };
type Config = { public_key: string; private_key: string };

// Sends one notification to every subscribed phone/browser. Returns the
// endpoints that no longer exist so the caller can remove them.
export async function sendPush(config: Config, subscriptions: PushSubscription[], message: PushMessage) {
  webpush.setVapidDetails("mailto:info@wavinvest.eu", config.public_key, config.private_key);
  const gone: string[] = [];
  await Promise.all(
    subscriptions.map((s) =>
      webpush.sendNotification(s, JSON.stringify(message), { TTL: 60 * 60 * 24 }).catch((e: { statusCode?: number }) => {
        if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.endpoint);
        else console.error("Push failed", e.statusCode);
      }),
    ),
  );
  return gone;
}
