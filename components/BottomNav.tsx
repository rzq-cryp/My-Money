'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, PieChart, Camera, Wallet, FileText } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Wallet', href: '/wallets', icon: Wallet },
    { name: 'Scan', href: '/scan', icon: Camera },
    { name: 'Tambah', href: '/add', icon: PlusCircle },
    { name: 'Laporan', href: '/export', icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[10px] ${
              isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}