import { DeductionCheckScreen } from '@/components/claims/deduction-check-screen';

/** S31 Deduction check: each deduction valid / challengeable / possibly, with the clause. */
export default async function ClaimPage({ params }: PageProps<'/[locale]/claims/[cid]'>) {
  const { cid } = await params;
  return <DeductionCheckScreen cid={cid} />;
}
