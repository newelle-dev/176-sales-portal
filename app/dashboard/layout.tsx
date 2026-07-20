import { getCachedSession } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StylistHeader from '@/components/dashboard/StylistHeader';

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
      <StylistHeader
        email={profile?.email || user.email || ''}
        name={profile?.name || 'Stylist'}
        initials={initials}
      />
      
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
