import './globals.css';
import Shell from '../components/Shell';

export const metadata = { title: 'AOA Portal', description: 'Admin Operations for ABA' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
