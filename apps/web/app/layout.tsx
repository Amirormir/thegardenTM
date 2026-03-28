import type { Metadata } from 'next';
import {
  JetBrains_Mono,
  Orbitron,
  Plus_Jakarta_Sans,
} from 'next/font/google';
import type { ReactNode } from 'react';
import { AppProviders } from './providers';
import './globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nexus League',
  description:
    'Plateforme premium de gestion de ligue League of Legends: transfermarket, effectifs, calendrier et statistiques.',
  metadataBase: new URL('http://localhost:3004'),
  openGraph: {
    title: 'Nexus League',
    description:
      'Transfermarket esports, gestion d’equipe, standings et statistiques Riot API.',
    images: ['/og.svg'],
    type: 'website',
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="fr"
      className={`dark ${orbitron.variable} ${plusJakartaSans.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
