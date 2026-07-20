'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { logoutAction } from '@/app/login/actions';
import { Key } from 'lucide-react';

interface StylistHeaderProps {
  email: string;
  name: string;
  initials: string;
}

export default function StylistHeader({ email, name, initials }: StylistHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-150 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm select-none sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-base sm:text-lg tracking-wider text-black">176 AVENUE</span>
        <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-bold uppercase tracking-wider">
          Stylist
        </span>
      </div>

      {/* Desktop Navigation / User Info & Actions */}
      <div className="hidden sm:flex items-center gap-4">
        <div className="flex flex-col text-right">
          <span className="text-xs font-bold text-gray-900">{name}</span>
          <span className="text-[10px] text-gray-400 font-medium">{email}</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 tracking-wider font-sans">
          {initials}
        </div>

        <ChangePasswordDialog
          trigger={
            <Button variant="outline" size="sm" className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-3 h-8 cursor-pointer flex items-center gap-1.5">
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

      {/* Mobile Menu Toggle via Avatar */}
      <div className="flex sm:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold tracking-wider font-sans transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 select-none active:scale-95 ${
            isMobileMenuOpen
              ? 'bg-black text-white border border-black'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {initials}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-150 shadow-md flex flex-col px-6 py-4 gap-4 sm:hidden z-50">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">{name}</span>
            <span className="text-xs text-gray-400 font-medium">{email}</span>
          </div>
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
