import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UploadZone from './UploadZone';
import DangerZone from './DangerZone';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the admin's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <main className="max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Upload CSV</h1>
        <p className="text-sm text-gray-500">Upload daily WessConnect CSV files to update stylist transactions.</p>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-gray-900">Drag & Drop Upload Zone</CardTitle>
          <CardDescription className="text-xs text-gray-400">Upload files like BANGSAR.csv here</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <UploadZone />
        </CardContent>
      </Card>

      <DangerZone />
    </main>
  );
}

