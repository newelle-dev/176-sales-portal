import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TeamManager from './TeamManager';

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all profiles where role is stylist
  const { data: stylists, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'stylist')
    .order('name', { ascending: true });

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Team Management</h1>
        <p className="text-sm text-gray-500">Manage stylist profiles, credentials, and access.</p>
      </div>

      <TeamManager initialStylists={stylists || []} />
    </main>
  );
}
