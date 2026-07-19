'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { loginAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scissors, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: undefined,
  });

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 md:p-8 overflow-hidden bg-gray-50">
      {/* Premium ambient background glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(50,50,50,0.03),transparent_40%)]" />

      <div className="w-full max-w-[400px] z-10">
        <Card className="border border-gray-200/80 bg-white/90 backdrop-blur-md shadow-xl">
          <CardHeader className="space-y-3 pb-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50/50 shadow-sm">
              <Scissors className="h-5 w-5 text-gray-700 transform -rotate-45" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                176 Avenue
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
                Sales Portal
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block"
                >
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Username"
                  required
                  autoFocus
                  autoComplete="username"
                  disabled={isPending}
                  className="h-10 px-3 bg-gray-50/50 border-gray-200 focus-visible:border-black focus-visible:ring-black/5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block"
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="•••••••••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                  className="h-10 px-3 bg-gray-50/50 border-gray-200 focus-visible:border-black focus-visible:ring-black/5 text-sm"
                />
              </div>

              {state?.error && (
                <div
                  className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-normal font-medium">{state.error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="h-10 w-full text-sm font-semibold transition-all active:scale-[0.98] select-none shadow-sm pt-0 pb-0 mt-2 cursor-pointer bg-black text-white hover:bg-slate-800"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400 select-none">
        <p>© {new Date().getFullYear()} 176 Avenue. All rights reserved.</p>
      </div>
    </main>
  );
}
