export const isPublicRegistrationEnabled =
  process.env.NEXT_PUBLIC_PUBLIC_REGISTRATION === 'true' || process.env.NODE_ENV !== 'production';
