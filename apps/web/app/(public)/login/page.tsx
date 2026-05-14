import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { auth } from '@/lib/auth';
import { isPublicRegistrationEnabled } from '@/lib/runtime-flags';

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
}

function getSearchValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function resolveAuthenticatedRedirectTarget(options: {
  callbackUrl?: string;
  role?: string | null;
  teamId?: string | null;
}) {
  const callbackUrl = options.callbackUrl;

  if (callbackUrl?.startsWith('/admin')) {
    return options.role === 'ADMIN' ? callbackUrl : '/';
  }

  if (callbackUrl?.startsWith('/team')) {
    return options.role === 'ADMIN' || options.teamId ? callbackUrl : '/';
  }

  if (callbackUrl?.startsWith('/')) {
    return callbackUrl;
  }

  if (options.role === 'ADMIN') {
    return '/admin';
  }

  if (options.teamId) {
    return '/team';
  }

  return '/';
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = getSearchValue(params.callbackUrl) ?? '/';
  const error = getSearchValue(params.error) ?? null;
  const session = await auth();

  if (session?.user) {
    redirect(
      resolveAuthenticatedRedirectTarget({
        callbackUrl,
        role: session.user.role,
        teamId: session.user.teamId,
      }),
    );
  }

  return (
    <LoginForm
      callbackUrl={callbackUrl}
      error={error}
      publicRegistrationEnabled={isPublicRegistrationEnabled}
    />
  );
}
