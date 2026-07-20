'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/app/login/actions';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { Key, Menu, X } from 'lucide-react';

export default function AdminHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-150 px-6 py-3.5 flex items-center justify-between gap-4 shadow-sm select-none">
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-lg tracking-wider text-black">176 AVENUE</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-bold uppercase tracking-wider">Admin</span>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden sm:flex items-center gap-1.5">
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

      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center gap-2">
        <ChangePasswordDialog
          trigger={
            <Button variant="outline" size="sm" className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-3 h-8 flex items-center justify-center gap-1.5 cursor-pointer">
              <Key className="w-3.5 h-3.5" />
              <span>Password</span>
            </Button>
          }
        />
        <form action={logoutAction}>
          <Button variant="outline" size="sm" className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-3 h-8 cursor-pointer">
            Sign Out
          </Button>
        </form>
      </div>

      {/* Mobile Menu Button */}
      <div className="flex sm:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-black h-9 w-9 cursor-pointer"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-150 shadow-md flex flex-col px-6 py-4 gap-4 sm:hidden z-50">
          <nav className="flex flex-col gap-1.5">
            <Link
              href="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${pathname === '/admin'
                  ? 'bg-gray-100 text-black'
                  : 'text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/upload"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${pathname === '/admin/upload' || pathname.startsWith('/admin/upload/')
                  ? 'bg-gray-100 text-black'
                  : 'text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
            >
              Upload CSV
            </Link>
            <Link
              href="/admin/team"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${pathname === '/admin/team' || pathname.startsWith('/admin/team/')
                  ? 'bg-gray-100 text-black'
                  : 'text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
            >
              Team Management
            </Link>
          </nav>
          <div className="h-px bg-gray-150 w-full" />
          <div className="flex flex-col gap-2">
            <ChangePasswordDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-3 h-9 w-full flex items-center justify-center gap-1.5 cursor-pointer"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </Button>
              }
            />
            <form action={logoutAction} className="w-full" onSubmit={() => setIsMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-3 h-9 w-full cursor-pointer">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
