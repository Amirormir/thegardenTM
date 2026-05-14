import { AdminNewsManager } from '@/components/features/admin/admin-news-manager';
import { TRPCProvider } from '@/lib/trpc/provider';

export default function AdminNewsPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Admin · News</p>
        <h1 className="mt-4 display-lg text-foreground">Gestion des articles.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-foreground-dim">
          Publiez les articles de la rédaction et choisissez celui qui illustre la une de
          l&apos;accueil.
        </p>
      </header>

      <TRPCProvider>
        <AdminNewsManager />
      </TRPCProvider>
    </div>
  );
}
