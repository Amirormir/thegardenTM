import { SeasonTwoDashboard } from '@/components/features/custom/season-two-dashboard';
import { getSeasonTwoData } from '@/lib/custom/season-two';

export const revalidate = 15;

export default async function CustomSeasonTwoPage() {
  const data = await getSeasonTwoData();
  return <SeasonTwoDashboard data={data} />;
}
