import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = { title: 'ABA Portal', description: 'Admin portal for ABACIA Services' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-5 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
