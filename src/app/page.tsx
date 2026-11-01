import { Inter, Roboto } from 'next/font/google';
import { Login } from '@/components/auth/Login';

const headingFont = Inter({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

const bodyFont = Roboto({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export default function LoginPage() {
  return (
    <Login
      headingFontClassName={headingFont.className}
      bodyFontClassName={bodyFont.className}
    />
  );
}
