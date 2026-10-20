const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Ese correo no es válido.",
  "auth/missing-email": "Escribe el correo.",
  "auth/missing-password": "Escribe la contraseña.",
  "auth/weak-password": "La contraseña necesita al menos 6 caracteres.",
  "auth/email-already-in-use": "Ese correo ya tiene una cuenta. Entra con él.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-disabled": "Esta cuenta está desactivada.",
  "auth/too-many-requests": "Demasiados intentos. Espera un momento y vuelve a probar.",
  "auth/network-request-failed": "Sin conexión. Revisa la red e inténtalo de nuevo.",
  "auth/popup-closed-by-user": "Se cerró la ventana de Google antes de entrar.",
  "auth/cancelled-popup-request": "Se canceló el acceso con Google.",
  "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.",
  "auth/unauthorized-domain": "Abre https://675whiteboard.vercel.app en Safari o Chrome para entrar.",
  "auth/web-storage-unsupported": "Este navegador no deja guardar la sesión. Ábrelo en Safari o Chrome.",
  "auth/operation-not-supported-in-this-environment": "Entra desde Safari o Chrome. Desde otra app el acceso con Google no funciona.",
  "auth/operation-not-allowed": "Ese método de acceso no está activado.",
};

export function messageForAuth(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return MESSAGES[code] ?? "No se pudo entrar. Inténtalo de nuevo.";
}
