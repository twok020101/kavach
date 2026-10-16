import { ReplanScreen } from './replan-screen';

/** S19 Re-plan and diff after a life change. */
export default async function ReplanPage({ params }: PageProps<'/[locale]/change/[eventId]'>) {
  const { eventId } = await params;
  return <ReplanScreen id={eventId} />;
}
