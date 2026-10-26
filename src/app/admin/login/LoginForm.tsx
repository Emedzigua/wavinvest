"use client";

import { useActionState, useState } from "react";
import Turnstile from "@/components/Turnstile";
import { signIn } from "../actions";

export default function LoginForm() {
  // Fresh captcha after every attempt (a token works only once)
  const [attempt, setAttempt] = useState(0);
  const [error, action, pending] = useActionState(async (prev: string | null, form: FormData) => {
    const result = await signIn(prev, form);
    setAttempt((a) => a + 1);
    return result;
  }, null);

  return (
    <form action={action} className="adm-form">
      <label className="field">
        <span>E-mail</span>
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label className="field">
        <span>Heslo</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <Turnstile language="sk" theme="light" resetKey={attempt} />
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn--dark btn--block" disabled={pending}>
        {pending ? "Prihlasujem…" : "Prihlásiť sa"}
      </button>
    </form>
  );
}
