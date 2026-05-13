import { CustomRankRecap } from '@/components/features/custom/custom-rank-recap';
import { CustomSubNav } from '@/components/features/custom/custom-sub-nav';

export default function CustomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <CustomSubNav />
      <CustomRankRecap />
      {children}
    </div>
  );
}
