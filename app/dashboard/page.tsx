import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { logoutAction } from '../login/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the stylist's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Sleek Monochromatic Header */}
      <header className="bg-white border-b border-gray-150 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 select-none">
          <span className="font-extrabold text-lg tracking-wider text-black">176 AVENUE</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-bold uppercase tracking-wider">Stylist</span>
        </div>
        <form action={logoutAction}>
          <Button variant="outline" size="sm" className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-3 h-8 cursor-pointer">
            Sign Out
          </Button>
        </form>
      </header>

      {/* Main content area */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 flex flex-col justify-center">
        <Card className="border-gray-200 bg-white shadow-md rounded-xl overflow-hidden">
          <CardHeader className="text-center pb-4 pt-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3.5 border border-gray-200 select-none">
              <span className="text-lg font-bold text-gray-700">
                {profile?.name ? profile.name[0].toUpperCase() : user.email?.[0].toUpperCase()}
              </span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-gray-900">
              Welcome back, {profile?.name || 'Stylist'}
            </CardTitle>
            <CardDescription className="text-gray-400 text-xs mt-0.5">
              {profile?.email || user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-6 px-6">
            <div className="p-4 bg-gray-50/50 rounded-lg border border-gray-150 space-y-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stylist Dashboard</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your mobile-first sales portal is being prepared. Soon, you will be able to track your daily sales, commissions, and package goals directly from this screen.
              </p>
            </div>

            <div className="border-t border-gray-150 pt-5">
              <div className="text-[10px] font-bold text-gray-450 text-gray-400 uppercase tracking-wider mb-3 select-none">
                Account Details
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Role</div>
                  <div className="font-semibold text-gray-800 capitalize mt-0.5">{profile?.role || 'Stylist'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Member Since</div>
                  <div className="font-semibold text-gray-800 mt-0.5">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
