'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, User, Loader2, AlertCircle } from 'lucide-react';
import { createStylistAction, updateStylistAction, deleteStylistAction } from './actions';

interface Stylist {
  id: string;
  name: string;
  email: string;
  role: string;
  wess_names?: string[];
  created_at: string;
}

interface TeamManagerProps {
  initialStylists: Stylist[];
  transactionNames: string[];
}

export default function TeamManager({ initialStylists, transactionNames }: TeamManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // State for WessConnect CSV name matches selector
  const [wessSearch, setWessSearch] = useState('');
  const [selectedWessNames, setSelectedWessNames] = useState<string[]>([]);

  // Filter stylists based on search query
  const filteredStylists = initialStylists.filter(
    (stylist) =>
      stylist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stylist.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createStylistAction(null, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setIsAddOpen(false);
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStylist) return;
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateStylistAction(null, { id: selectedStylist.id, formData });
      if (res.error) {
        setError(res.error);
      } else {
        setIsEditOpen(false);
        setSelectedStylist(null);
      }
    });
  };

  const handleDeleteSubmit = async () => {
    if (!selectedStylist) return;
    setError(null);

    startTransition(async () => {
      const res = await deleteStylistAction(selectedStylist.id);
      if (res.error) {
        setError(res.error);
      } else {
        setIsDeleteOpen(false);
        setSelectedStylist(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search stylists..."
            className="pl-9 bg-gray-50/50 border-gray-200 focus-visible:bg-white w-full h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setError(null);
            setWessSearch('');
            setSelectedWessNames([]);
            setIsAddOpen(true);
          }}
          className="w-full sm:w-auto bg-black text-white hover:bg-slate-800 gap-1.5 h-9 px-4 text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add Stylist
        </Button>
      </div>

      {/* Stylists Table/Grid */}
      <Card className="border-gray-200 bg-white shadow-sm overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          {filteredStylists.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">
                  <th className="px-6 py-3">Stylist Name</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3 hidden md:table-cell">Role</th>
                  <th className="px-6 py-3 hidden sm:table-cell">Joined Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredStylists.map((stylist) => (
                  <tr key={stylist.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 text-gray-700 font-bold text-xs select-none">
                          {stylist.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{stylist.name}</div>
                          {stylist.wess_names && stylist.wess_names.length > 0 && (
                            <div className="text-[10px] text-gray-400 font-medium select-all mt-0.5">
                              Matches: {stylist.wess_names.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">{stylist.email}</td>
                    <td className="px-6 py-3.5 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider select-none">
                        {stylist.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-450 text-gray-400 hidden sm:table-cell">
                      {new Date(stylist.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-gray-400 hover:text-black hover:bg-gray-100"
                          onClick={() => {
                            setError(null);
                            setSelectedStylist(stylist);
                            setWessSearch('');
                            setSelectedWessNames(stylist.wess_names || []);
                            setIsEditOpen(true);
                          }}
                          title="Edit Stylist"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-gray-400 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setError(null);
                            setSelectedStylist(stylist);
                            setIsDeleteOpen(true);
                          }}
                          title="Delete Stylist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center select-none">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No stylists found</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                {searchQuery
                  ? "We couldn't find any stylists matching that search query."
                  : 'Start by adding a stylist to grant them access to the dashboard.'}
              </p>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) {
          setWessSearch('');
          setSelectedWessNames([]);
        }
      }}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full gap-0 select-none">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-gray-900 font-bold text-lg">Add New Stylist</DialogTitle>
              <DialogDescription className="text-gray-400 text-xs mt-1">
                Create a stylist account. They can immediately log in with their email and password.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 text-destructive rounded-lg text-xs flex items-start gap-2 border border-destructive/15">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-4 mb-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Full Name</label>
                <Input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Bangsar Stylist"
                  className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Email Address</label>
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. stylist@176avenue.com"
                  className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Login Password</label>
                <Input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  WessConnect CSV Name Matches
                </label>

                {/* Selected Matches as Badges */}
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1.5 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">
                  {selectedWessNames.length > 0 ? (
                    selectedWessNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-250 select-none"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => setSelectedWessNames(selectedWessNames.filter((n) => n !== name))}
                          className="text-gray-400 hover:text-gray-650 focus:outline-none font-bold text-xs"
                          disabled={isPending}
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-[10px] italic select-none p-1">No names selected. Choose from the list below.</span>
                  )}
                </div>

                {/* Search and List */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="relative border-b border-gray-150">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search transaction names..."
                      value={wessSearch}
                      onChange={(e) => setWessSearch(e.target.value)}
                      className="pl-8 border-0 bg-transparent h-8.5 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 rounded-none w-full"
                      disabled={isPending}
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 text-xs">
                    {/* Filtered names */}
                    {transactionNames
                      .filter((name) => name.toLowerCase().includes(wessSearch.toLowerCase()))
                      .map((name) => {
                        const isSelected = selectedWessNames.includes(name.toLowerCase());
                        return (
                          <button
                            key={name}
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedWessNames(selectedWessNames.filter((n) => n !== name.toLowerCase()));
                              } else {
                                setSelectedWessNames([...selectedWessNames, name.toLowerCase()]);
                              }
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected ? 'bg-gray-50 font-semibold text-black' : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span>{name}</span>
                            {isSelected && <span className="text-[10px] text-emerald-600 font-bold select-none">✓ Selected</span>}
                          </button>
                        );
                      })}

                    {/* Option to add custom name */}
                    {wessSearch.trim() &&
                      !transactionNames.some((name) => name.toLowerCase() === wessSearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const newName = wessSearch.trim().toLowerCase();
                            if (!selectedWessNames.includes(newName)) {
                              setSelectedWessNames([...selectedWessNames, newName]);
                            }
                            setWessSearch('');
                          }}
                          className="w-full text-left px-3 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-gray-50 font-medium flex items-center gap-1.5 transition-colors border-t border-dashed border-gray-150 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add "{wessSearch.trim()}" as custom match</span>
                        </button>
                      )}

                    {transactionNames.filter((name) => name.toLowerCase().includes(wessSearch.toLowerCase())).length === 0 &&
                      !wessSearch.trim() && (
                        <div className="px-3 py-4 text-center text-gray-400 italic">No transaction names available.</div>
                      )}
                  </div>
                </div>

                {/* Hidden input to submit to backend */}
                <input type="hidden" name="wess_names" value={selectedWessNames.join(', ')} />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-gray-100 flex flex-row justify-end items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setWessSearch('');
                  setSelectedWessNames([]);
                }}
                className="border-gray-200 text-gray-500 hover:text-black h-9 text-xs font-semibold px-4 rounded-lg cursor-pointer"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-black text-white hover:bg-slate-800 h-9 px-4 gap-1 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditOpen(false);
            setSelectedStylist(null);
            setWessSearch('');
            setSelectedWessNames([]);
          }
        }}
      >
        <DialogContent className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full gap-0 select-none">
          {selectedStylist && (
            <form onSubmit={handleEditSubmit}>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-gray-900 font-bold text-lg">Edit Stylist Profile</DialogTitle>
                <DialogDescription className="text-gray-400 text-xs mt-1">
                  Modify the stylist's credentials or change their password.
                </DialogDescription>
              </DialogHeader>

              {error && (
                <div className="mb-4 p-3 bg-destructive/5 text-destructive rounded-lg text-xs flex items-start gap-2 border border-destructive/15">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-4 mb-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Full Name</label>
                  <Input
                    name="name"
                    type="text"
                    required
                    defaultValue={selectedStylist.name}
                    className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Email Address</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    defaultValue={selectedStylist.email}
                    className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    New Password <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                  </label>
                  <Input
                    name="password"
                    type="password"
                    minLength={6}
                    placeholder="Leave blank to keep current"
                    className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    WessConnect CSV Name Matches
                  </label>

                  {/* Selected Matches as Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1.5 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">
                    {selectedWessNames.length > 0 ? (
                      selectedWessNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-250 select-none"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => setSelectedWessNames(selectedWessNames.filter((n) => n !== name))}
                            className="text-gray-400 hover:text-gray-650 focus:outline-none font-bold text-xs"
                            disabled={isPending}
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-[10px] italic select-none p-1">No names selected. Choose from the list below.</span>
                  )}
                </div>

                {/* Search and List */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="relative border-b border-gray-150">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search transaction names..."
                      value={wessSearch}
                      onChange={(e) => setWessSearch(e.target.value)}
                      className="pl-8 border-0 bg-transparent h-8.5 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 rounded-none w-full"
                      disabled={isPending}
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 text-xs">
                    {/* Filtered names */}
                    {transactionNames
                      .filter((name) => name.toLowerCase().includes(wessSearch.toLowerCase()))
                      .map((name) => {
                        const isSelected = selectedWessNames.includes(name.toLowerCase());
                        return (
                          <button
                            key={name}
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedWessNames(selectedWessNames.filter((n) => n !== name.toLowerCase()));
                              } else {
                                setSelectedWessNames([...selectedWessNames, name.toLowerCase()]);
                              }
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected ? 'bg-gray-50 font-semibold text-black' : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span>{name}</span>
                            {isSelected && <span className="text-[10px] text-emerald-600 font-bold select-none">✓ Selected</span>}
                          </button>
                        );
                      })}

                    {/* Option to add custom name */}
                    {wessSearch.trim() &&
                      !transactionNames.some((name) => name.toLowerCase() === wessSearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const newName = wessSearch.trim().toLowerCase();
                            if (!selectedWessNames.includes(newName)) {
                              setSelectedWessNames([...selectedWessNames, newName]);
                            }
                            setWessSearch('');
                          }}
                          className="w-full text-left px-3 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-gray-50 font-medium flex items-center gap-1.5 transition-colors border-t border-dashed border-gray-150 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add "{wessSearch.trim()}" as custom match</span>
                        </button>
                      )}

                    {transactionNames.filter((name) => name.toLowerCase().includes(wessSearch.toLowerCase())).length === 0 &&
                      !wessSearch.trim() && (
                        <div className="px-3 py-4 text-center text-gray-400 italic">No transaction names available.</div>
                      )}
                  </div>
                </div>

                {/* Hidden input to submit to backend */}
                <input type="hidden" name="wess_names" value={selectedWessNames.join(', ')} />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-gray-100 flex flex-row justify-end items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setSelectedStylist(null);
                  setWessSearch('');
                  setSelectedWessNames([]);
                }}
                className="border-gray-200 text-gray-500 hover:text-black h-9 text-xs font-semibold px-4 rounded-lg cursor-pointer"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-black text-white hover:bg-slate-800 h-9 px-4 gap-1 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>

      {/* Delete Stylist Dialog */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteOpen(false);
            setSelectedStylist(null);
          }
        }}
      >
        <DialogContent className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full gap-0 select-none">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-gray-900 font-bold text-lg">Delete Stylist Account</DialogTitle>
            <DialogDescription className="text-gray-400 text-xs mt-1 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{selectedStylist?.name}</span>? This action is irreversible and will remove all their access and sales transaction history.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-650 rounded-lg text-xs flex items-start gap-2 border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-gray-100 flex flex-row justify-end items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedStylist(null);
              }}
              className="border-gray-200 text-gray-500 hover:text-black h-9 text-xs font-semibold px-4 rounded-lg cursor-pointer"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 hover:bg-red-750 text-white h-9 px-4 gap-1 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
              onClick={handleDeleteSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                </>
              ) : (
                'Yes, Delete Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
