'use client';

import * as React from 'react';
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
import { updateYearlyTargetAction } from './actions';
import { Settings2, Loader2 } from 'lucide-react';

interface EditTargetDialogProps {
  year: number;
  initialTarget: number;
}

export default function EditTargetDialog({ year, initialTarget }: EditTargetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [targetVal, setTargetVal] = React.useState(initialTarget.toString());
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTargetVal(initialTarget.toString());
  }, [initialTarget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numericVal = parseFloat(targetVal);

    if (isNaN(numericVal) || numericVal < 0) {
      setError('Please enter a valid positive number');
      return;
    }

    startTransition(async () => {
      const res = await updateYearlyTargetAction(year, numericVal);
      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs font-semibold px-3 h-8 border-gray-200 text-gray-500 hover:text-black flex items-center gap-1.5 shadow-sm"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Configure Target
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border border-gray-150 rounded-xl shadow-lg p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Set Sales Target</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Configure the overall salon yearly sales target for the year {year}. (Excluding deductions).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <label htmlFor="target-input" className="text-xs font-bold text-gray-500 block uppercase tracking-wider">
              Year {year} Target (RM)
            </label>
            <Input
              id="target-input"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 1200000"
              value={targetVal}
              onChange={(e) => setTargetVal(e.target.value)}
              disabled={isPending}
              className="bg-white border-gray-200 focus:border-black text-gray-900 rounded-lg text-sm px-3 h-10 w-full"
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="text-gray-500 border-gray-200 hover:text-black h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-black hover:bg-gray-800 text-white h-9 text-xs flex items-center gap-1.5 px-4 font-semibold rounded-lg"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Target
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
