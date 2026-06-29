// Inscription publique activee par defaut (y compris en production).
// Pour la fermer, definir NEXT_PUBLIC_PUBLIC_REGISTRATION="false".
export const isPublicRegistrationEnabled =
  process.env.NEXT_PUBLIC_PUBLIC_REGISTRATION !== 'false';
