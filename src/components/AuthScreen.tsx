import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useAuth } from "@/state/auth-context";

function inAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|Twitter|Snapchat/i.test(navigator.userAgent);
}

function useVisibleFrame(): { height: number; offset: number } | null {
  const [frame, setFrame] = useState<{ height: number; offset: number } | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const apply = () => setFrame({ height: viewport.height, offset: viewport.offsetTop });
    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
    };
  }, []);
  return frame;
}

export function AuthScreen() {
  const auth = useAuth();
  const frame = useVisibleFrame();
  const embedded = inAppBrowser();
  const [mode, setMode] = useState<"entrar" | "crear">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "crear") void auth.signUpEmail(email, password);
    else void auth.signInEmail(email, password);
  };

  return (
    <div
      className="plays-scroll flex h-full flex-col overflow-y-auto bg-ink px-4"
      style={frame ? { height: frame.height, transform: `translateY(${frame.offset}px)` } : undefined}
    >
      <div className="my-auto w-full max-w-md self-center rounded-3xl border border-line bg-panel p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber">675whiteboard</p>
        <h1 className="mt-2 font-display text-5xl italic text-cream">Pizarra</h1>
        <p className="mt-2 text-sm text-muted">Entra para guardar las jugadas en tu cuenta y abrirlas en el iPad o en el ordenador.</p>

        {!auth.configured && (
          <p className="mt-6 rounded-xl bg-danger/15 px-3 py-2 text-sm text-cream">
            Falta la configuración de Firebase. Copia `.env.example` a `.env.local` y reinicia el servidor.
          </p>
        )}

        {embedded && (
          <p className="mt-6 rounded-xl bg-amber/15 px-3 py-2 text-sm text-cream">
            Ábrelo en Safari o Chrome. Desde WhatsApp o Instagram el acceso con Google no funciona. Puedes entrar con correo.
          </p>
        )}

        <Button
          className="mt-6 h-12 w-full bg-cream text-ink hover:bg-cream/90"
          disabled={!auth.configured || auth.busy}
          onClick={() => void auth.signInGoogle()}
        >
          <GoogleMark />
          Continuar con Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-line" />
          o con correo
          <span className="h-px flex-1 bg-line" />
        </div>

        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-1.5">
            <Label htmlFor="correo">Correo</Label>
            <Input
              id="correo"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              placeholder="tu@correo.com"
              onChange={(event) => setEmail(event.target.value)}
              onFocus={(event) => event.currentTarget.scrollIntoView({ block: "center" })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="clave">Contraseña</Label>
            <Input
              id="clave"
              type="password"
              autoComplete={mode === "crear" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              placeholder="Mínimo 6 caracteres"
              onChange={(event) => setPassword(event.target.value)}
              onFocus={(event) => event.currentTarget.scrollIntoView({ block: "center" })}
            />
          </div>
          {auth.error && <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-cream">{auth.error}</p>}
          <Button type="submit" className="mt-1 h-12 w-full" disabled={!auth.configured || auth.busy}>
            {mode === "crear" ? "Crear cuenta" : "Entrar"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-sm text-muted underline-offset-4 hover:text-cream hover:underline"
          onClick={() => {
            auth.clearError();
            setMode(mode === "crear" ? "entrar" : "crear");
          }}
        >
          {mode === "crear" ? "¿Ya tienes cuenta? Entrar" : "¿No tienes cuenta? Crear una"}
        </button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8A6.4 6.4 0 1 1 12 5.6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.8 3.2 14.6 2.2 12 2.2 6.8 2.2 2.6 6.4 2.6 11.6S6.8 21 12 21c5.4 0 9-3.8 9-9.1 0-.6 0-1.1-.1-1.6H12Z" />
      <path fill="#34A853" d="M3.9 8.7 7 11c.8-1.9 2.7-3.3 5-3.3 1.8 0 3 .8 3.7 1.4l2.5-2.4C16.8 5.2 14.6 4.2 12 4.2 8.4 4.2 5.3 6.2 3.9 8.7Z" />
      <path fill="#FBBC05" d="M12 21c2.6 0 4.8-1 6.3-2.6l-2.9-2.4c-.8.6-1.9 1.1-3.4 1.1-3.9 0-5.3-2.5-5.5-3.8l-3.1 2.4C4.8 18.8 8.1 21 12 21Z" />
      <path fill="#4285F4" d="M21 11.9c0-.6 0-1.1-.1-1.6H12v3.9h5.5c-.3 1.4-1.1 2.4-2.1 3.1l2.9 2.4C20.1 18 21 15.3 21 11.9Z" />
    </svg>
  );
}
