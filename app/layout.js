import './globals.css';
import Shell from '../components/Shell';

export const metadata = {
  title: 'AOA Portal — Anatomy of ABA',
  description: 'Operator Command Center for ABA Infrastructure',
  icons: { icon: 'https://i.imgur.com/0be7HCF.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
