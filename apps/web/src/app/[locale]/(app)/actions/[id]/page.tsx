import { ActionReviewScreen } from './action-review-screen';

/** S20 Action review: read the drafted letter or reminder, then approve or dismiss. */
export default async function ActionReviewPage({ params }: PageProps<'/[locale]/actions/[id]'>) {
  const { id } = await params;
  return <ActionReviewScreen id={id} />;
}
