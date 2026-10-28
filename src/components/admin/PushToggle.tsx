"use client";

import { useEffect, useState, useTransition } from "react";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/app/admin/actions";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";
type SubJson = { endpoint: string; keys: { p256dh: string; auth: string } };

function toKey(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isInstalled = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Turns phone/browser notifications for new quote requests on or off
export default function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
          return setState(isIos() && !isInstalled() ? "install" : "unsupported");
        }
        if (Notification.permission === "denied") return setState("denied");
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/admin" });
        const sub = await reg.pushManager.getSubscription();
        // Re-save an existing subscription, in case saving failed earlier
        if (sub) await savePushSubscription(sub.toJSON() as SubJson, navigator.userAgent);
        setState(sub ? "on" : "off");
      } catch (e) {
        setMessage(`Chyba: ${e instanceof Error ? e.message : String(e)}`);
        setState("off");
      }
    })();
  }, []);

  // Permission must be asked directly in the click (iPhone rejects it otherwise)
  async function enable() {
    setMessage("");
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch (e) {
      return setMessage(`Chyba: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (permission !== "granted") return setState("denied");
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/admin" });
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
        await savePushSubscription(sub.toJSON() as SubJson, navigator.userAgent);
        setState("on");
        setMessage(await sendTestPush());
      } catch (e) {
        setMessage(`Nepodarilo sa zapnúť: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }

  function disable() {
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/admin");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });
  }

  if (state === "loading") return <p className="muted small">Načítavam…</p>;
  if (state === "install")
    return (
      <ol className="steps">
        <li>
          V Safari kliknite na <strong>Zdieľať</strong> → <strong>Pridať na plochu</strong>.
        </li>
        <li>Otvorte administráciu z ikony na ploche.</li>
        <li>Vráťte sa sem a zapnite upozornenia.</li>
      </ol>
    );
  if (state === "unsupported") return <p className="muted">Tento prehliadač upozornenia nepodporuje.</p>;
  if (state === "denied")
    return <p className="muted">Upozornenia sú zablokované. Povoľte ich v nastaveniach telefónu pre túto aplikáciu.</p>;

  return (
    <div className="btn-row">
      {state === "on" ? (
        <>
          <span className="pill pill--active">Zapnuté na tomto zariadení</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  setMessage(await sendTestPush());
                } catch (e) {
                  setMessage(`Chyba: ${e instanceof Error ? e.message : String(e)}`);
                }
              })
            }
          >
            Poslať test
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={pending} onClick={disable}>
            Vypnúť
          </button>
        </>
      ) : (
        <button type="button" className="btn btn--dark btn--sm" disabled={pending} onClick={enable}>
          Zapnúť upozornenia na tomto zariadení
        </button>
      )}
      {message && <span className="muted small">{message}</span>}
    </div>
  );
}
