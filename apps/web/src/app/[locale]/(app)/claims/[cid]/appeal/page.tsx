import { AppealReviewScreen } from '@/components/claims/appeal-review-screen';

/** S32 Appeal review: the verified letter, edits re-checked, then PDF / copy / email. */
export default async function AppealPage({ params }: PageProps<'/[locale]/claims/[cid]/appeal'>) {
  const { cid } = await params;
  return <AppealReviewScreen cid={cid} />;
}
