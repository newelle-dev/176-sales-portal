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
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 md:p-8 overflow-hidden bg-background">
      {/* Premium ambient background glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(50,50,50,0.08),transparent_40%)]" />

      <div className="w-full max-w-[400px] z-10">
        <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-2xl">
          <CardHeader className="space-y-2 pb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background shadow-sm">
              <Scissors className="h-5 w-5 text-foreground/80 transform -rotate-45" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                176 Avenue
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
                Sales Portal
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <form action={formAction} className="grid gap-4">
              <div className="grid gap-1.5">
                <label 
                  htmlFor="email" 
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@176avenue.com"
                  required
                  autoFocus
                  autoComplete="email"
                  disabled={isPending}
                  className="h-11 px-3.5 text-base md:text-sm bg-background/50 border-border/60 focus-visible:border-foreground/40 focus-visible:ring-foreground/10"
                />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <label 
                    htmlFor="password" 
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Password
                  </label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                  className="h-11 px-3.5 text-base md:text-sm bg-background/50 border-border/60 focus-visible:border-foreground/40 focus-visible:ring-foreground/10"
                />
              </div>

              {state?.error && (
                <div 
                  className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive/90 animate-in fade-in slide-in-from-top-1 duration-200"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-normal">{state.error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="h-11 w-full text-base font-semibold transition-all active:scale-[0.98] select-none shadow-md mt-2 cursor-pointer"
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

      <div className="mt-8 text-center text-xs text-muted-foreground/60 select-none">
        <p>© {new Date().getFullYear()} 176 Avenue. All rights reserved.</p>
      </div>
    </main>
  );
}
