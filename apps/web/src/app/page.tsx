import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has('access_token');

  if (hasSession) {
    redirect('/dashboard');
  }

  redirect('/login');
}
