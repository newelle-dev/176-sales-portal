import { getCachedSession } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { logoutAction } from '../login/actions';
import { Button } from '@/components/ui/button';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCachedSession();

  if (!user) {
    redirect('/login');
  }

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || 'S';


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Premium Monochromatic Header */}
      <header className="bg-white border-b border-gray-150 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm select-none sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base sm:text-lg tracking-wider text-black">176 AVENUE</span>
          <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-bold uppercase tracking-wider">
            Stylist
          </span>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-gray-900">{profile?.name || 'Stylist'}</span>
            <span className="text-[10px] text-gray-400 font-medium">{profile?.email || user.email}</span>
          </div>
          
          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 tracking-wider">
            {initials}
          </div>
          
          <form action={logoutAction}>
            <Button variant="outline" size="sm" className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-2.5 sm:px-3 h-8 cursor-pointer">
              Sign Out
            </Button>
          </form>
        </div>
      </header>
      
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
