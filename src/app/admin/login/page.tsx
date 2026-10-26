import type { Metadata } from "next";
import Logo from "@/components/Logo";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Prihlásenie" };

export default function LoginPage() {
  return (
    <main className="adm-login">
      <div className="adm-login__card">
        <Logo />
        <h1 className="heading">Administrácia</h1>
        <LoginForm />
      </div>
    </main>
  );
}
