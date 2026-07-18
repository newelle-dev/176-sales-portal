'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/app/login/actions';

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-150 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm select-none">
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-lg tracking-wider text-black">176 AVENUE</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-bold uppercase tracking-wider">Admin</span>
      </div>
      <nav className="flex items-center gap-1.5">
        <Link
          href="/admin"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${pathname === '/admin'
              ? 'bg-gray-100 text-black'
              : 'text-gray-400 hover:text-black hover:bg-gray-50'
            }`}
        >
          Dashboard
        </Link>
        <Link
          href="/admin/upload"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${pathname === '/admin/upload' || pathname.startsWith('/admin/upload/')
              ? 'bg-gray-100 text-black'
              : 'text-gray-400 hover:text-black hover:bg-gray-50'
            }`}
        >
          Upload CSV
        </Link>
        <Link
          href="/admin/team"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${pathname === '/admin/team' || pathname.startsWith('/admin/team/')
              ? 'bg-gray-100 text-black'
              : 'text-gray-400 hover:text-black hover:bg-gray-50'
            }`}
        >
          Team Management
        </Link>
      </nav>
      <form action={logoutAction} className="sm:ml-0">
        <Button variant="outline" size="sm" className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-3 h-8 w-full sm:w-auto">
          Sign Out
        </Button>
      </form>
    </header>
  );
}
