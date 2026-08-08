import type { Metadata } from 'next';
import './styles.css';
export const metadata: Metadata = {
  title: 'Company OS',
  description: 'Auditable company operations console',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
