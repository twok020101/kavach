import { setRequestLocale } from 'next-intl/server';
import { SignInScreen } from './sign-in-screen';

/** S02 Sign in. With `?invite=` it shows who invited you and joins their household. */
export default async function SignInPage({ params, searchParams }: PageProps<'/[locale]/sign-in'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { invite } = await searchParams;
  return <SignInScreen invite={typeof invite === 'string' ? invite : null} />;
}
