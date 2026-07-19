'use client';

import * as React from 'react';
import { useState, useActionState, useEffect } from 'react';
import { changePasswordAction } from '@/app/login/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, AlertCircle, Loader2 } from 'lucide-react';

interface ChangePasswordDialogProps {
  trigger?: React.ReactNode;
}

export function ChangePasswordDialog({ trigger }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(changePasswordAction, {
    error: undefined,
  });

  // Reset errors when dialog closes or opens
  useEffect(() => {
    if (!open) {
      setClientError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setClientError(null);
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      e.preventDefault();
      setClientError('All fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      e.preventDefault();
      setClientError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      e.preventDefault();
      setClientError('New passwords do not match.');
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="text-gray-500 hover:text-black border-gray-200 text-xs font-semibold px-2.5 sm:px-3 h-8 cursor-pointer flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Key className="h-5 w-5 text-gray-700" />
            Change Password
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-xs font-medium">
            Update your account password. For security, you will be signed out after a successful change.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label
              htmlFor="currentPassword"
              className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block"
            >
              Current Password
            </label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              placeholder="•••••••••••••••"
              required
              disabled={isPending}
              className="h-10 px-3 bg-gray-50/50 border-gray-200 focus-visible:border-black focus-visible:ring-black/5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="newPassword"
              className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block"
            >
              New Password
            </label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="•••••••••••••••"
              required
              disabled={isPending}
              className="h-10 px-3 bg-gray-50/50 border-gray-200 focus-visible:border-black focus-visible:ring-black/5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block"
            >
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="•••••••••••••••"
              required
              disabled={isPending}
              className="h-10 px-3 bg-gray-50/50 border-gray-200 focus-visible:border-black focus-visible:ring-black/5 text-sm"
            />
          </div>

          {(clientError || state?.error) && (
            <div
              className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-normal font-medium">{clientError || state?.error}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 w-full text-sm font-semibold transition-all active:scale-[0.98] select-none shadow-sm cursor-pointer bg-black text-white hover:bg-slate-800 flex items-center justify-center"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
