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
  initialTotal: number;
  initialHair: number;
  initialNails: number;
  initialArtistryLash: number;
}

export default function EditTargetDialog({
  year,
  initialTotal,
  initialHair,
  initialNails,
  initialArtistryLash,
}: EditTargetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [hairVal, setHairVal] = React.useState(initialHair.toString());
  const [nailsVal, setNailsVal] = React.useState(initialNails.toString());
  const [artistryLashVal, setArtistryLashVal] = React.useState(initialArtistryLash.toString());
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHairVal(initialHair.toString());
    setNailsVal(initialNails.toString());
    setArtistryLashVal(initialArtistryLash.toString());
  }, [initialHair, initialNails, initialArtistryLash]);

  const hairNum = parseFloat(hairVal) || 0;
  const nailsNum = parseFloat(nailsVal) || 0;
  const artistryLashNum = parseFloat(artistryLashVal) || 0;
  const totalVal = hairNum + nailsNum + artistryLashNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (hairNum < 0 || nailsNum < 0 || artistryLashNum < 0) {
      setError('Targets must be positive numbers');
      return;
    }

    startTransition(async () => {
      const res = await updateYearlyTargetAction(year, {
        TOTAL: totalVal,
        HAIR: hairNum,
        NAILS: nailsNum,
        ARTISTRY_LASH: artistryLashNum,
      });
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
      <DialogContent className="sm:max-w-lg bg-white border border-gray-150 rounded-xl shadow-lg p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Configure Sales Targets</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Configure department-level yearly targets for the year {year}. (Excluding deductions).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mb-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="hair-target" className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                  Hair (RM)
                </label>
                <Input
                  id="hair-target"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 5044500"
                  value={hairVal}
                  onChange={(e) => setHairVal(e.target.value)}
                  disabled={isPending}
                  className="bg-white border-gray-200 focus:border-black text-gray-900 rounded-lg text-xs px-3 h-9 w-full"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="nails-target" className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                  Nails (RM)
                </label>
                <Input
                  id="nails-target"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 1561500"
                  value={nailsVal}
                  onChange={(e) => setNailsVal(e.target.value)}
                  disabled={isPending}
                  className="bg-white border-gray-200 focus:border-black text-gray-900 rounded-lg text-xs px-3 h-9 w-full"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="lash-target" className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                  Artistry/Lash (RM)
                </label>
                <Input
                  id="lash-target"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 2394000"
                  value={artistryLashVal}
                  onChange={(e) => setArtistryLashVal(e.target.value)}
                  disabled={isPending}
                  className="bg-white border-gray-200 focus:border-black text-gray-900 rounded-lg text-xs px-3 h-9 w-full"
                />
              </div>
            </div>

            <div className="space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-150">
              <span className="text-[10px] font-bold text-gray-450 block uppercase tracking-wider">
                Calculated Total Target (RM)
              </span>
              <div className="text-base font-extrabold text-gray-900 select-none">
                RM {totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
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
              Save Targets
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
