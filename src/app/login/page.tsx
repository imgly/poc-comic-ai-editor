import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Login · Comic Studio' };

/** Password screen. `src/proxy.ts` sends every visitor without a session here. */
export default function LoginPage() {
  return <LoginForm />;
}
