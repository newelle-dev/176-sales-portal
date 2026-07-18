'use client';

import React, { useState, useTransition } from 'react';
import { clearTransactionsAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Trash2, Loader2, CheckCircle2 } from 'lucide-react';

export default function DangerZone() {
  const [confirmText, setConfirmText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClearTransactions = () => {
    if (confirmText !== 'DELETE') return;

    setStatus(null);
    startTransition(async () => {
      const res = await clearTransactionsAction();
      setStatus(res);
      if (res.success) {
        setConfirmText('');
        // Close the dialog after a brief delay to show success state
        setTimeout(() => {
          setIsOpen(false);
          setStatus(null);
        }, 1500);
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmText('');
      setStatus(null);
    }
  };

  return (
    <div className="border border-red-200 bg-red-50/20 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-red-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-red-950 flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
            Danger Zone
          </h3>
          <p className="text-xs text-red-700/80 mt-1">
            Destructive actions that cannot be undone. Please exercise extreme caution.
          </p>
        </div>
      </div>
      <div className="px-6 py-6 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-gray-900">Clear Transaction Table</h4>
          <p className="text-xs text-gray-500">
            Permanently delete all transaction data. Stylist dashboards will be emptied.
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 px-4 h-9 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Transactions
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md border-gray-200">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Are you absolutely sure?
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 leading-relaxed">
                This action is permanent and cannot be undone. It will delete all records from the
                transaction table, clearing all stylist performance data.
              </DialogDescription>
            </DialogHeader>

            {status?.success ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
                <p className="text-sm font-bold">Transactions cleared successfully!</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="confirm-delete" className="text-xs font-bold text-gray-700">
                    To confirm, please type <span className="text-red-600 font-mono">DELETE</span> below:
                  </label>
                  <Input
                    id="confirm-delete"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="border-gray-200 focus-visible:ring-red-500/20 focus-visible:border-red-500 h-9 font-mono"
                    disabled={isPending}
                  />
                </div>

                {status?.error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{status.error}</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="sm:justify-end gap-2 border-t border-gray-100 bg-gray-50/50 -mx-4 -mb-4 p-4 rounded-b-xl">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-xs font-semibold h-8 border-gray-200 text-gray-600 hover:text-black"
              >
                Cancel
              </Button>
              {!status?.success && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearTransactions}
                  disabled={confirmText !== 'DELETE' || isPending}
                  className="text-xs font-semibold h-8 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:border-transparent flex items-center gap-1.5 transition-all"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3" />
                      Permanently Delete
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
