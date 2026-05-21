import { getPublicSeasonLabel } from '@/server/public/page-data';
import { NavbarClient } from './navbar-client';

export async function Navbar() {
  const seasonLabel = await getPublicSeasonLabel();

  return <NavbarClient seasonLabel={seasonLabel} />;
}
