'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import WessNameSelector from '@/components/admin/WessNameSelector';
import type { Tables } from '@/types/database.types';

type Stylist = Tables<'profiles'>;

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

  // Scoped error + pending state per dialog to avoid cross-dialog bleed
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isAddPending, startAddTransition] = useTransition();
  const [isEditPending, startEditTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  // State for WessConnect CSV name matches selector
  const [wessSearch, setWessSearch] = useState('');
  const [selectedWessNames, setSelectedWessNames] = useState<string[]>([]);

  // Filter stylists based on search query
  const filteredStylists = initialStylists.filter(
    (stylist) =>
      stylist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stylist.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError(null);
    const formData = new FormData(e.currentTarget);

    startAddTransition(async () => {
      const res = await createStylistAction(null, formData);
      if (res.error) {
        setAddError(res.error);
      } else {
        setIsAddOpen(false);
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStylist) return;
    setEditError(null);
    const formData = new FormData(e.currentTarget);

    startEditTransition(async () => {
      const res = await updateStylistAction(null, { id: selectedStylist.id, formData });
      if (res.error) {
        setEditError(res.error);
      } else {
        setIsEditOpen(false);
        setSelectedStylist(null);
      }
    });
  };

  const handleDeleteSubmit = async () => {
    if (!selectedStylist) return;
    setDeleteError(null);

    startDeleteTransition(async () => {
      const res = await deleteStylistAction(selectedStylist.id);
      if (res.error) {
        setDeleteError(res.error);
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
            aria-label="Search stylists by name or email"
          />
        </div>
        <Button
          onClick={() => {
            setAddError(null);
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
                  <th scope="col" className="px-6 py-3">Stylist Name</th>
                  <th scope="col" className="px-6 py-3">Email Address</th>
                  <th scope="col" className="px-6 py-3 hidden md:table-cell">Role</th>
                  <th scope="col" className="px-6 py-3 hidden md:table-cell">Department</th>
                  <th scope="col" className="px-6 py-3 hidden sm:table-cell">Joined Date</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
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
                    <td className="px-6 py-3.5 hidden md:table-cell">
                      {stylist.department ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider select-none">
                          {stylist.department === 'ARTISTRY_LASH' ? 'Artistry & Lash' : stylist.department}
                        </span>
                      ) : (
                        <span className="text-gray-455 italic font-medium select-none">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 hidden sm:table-cell">
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
                            setEditError(null);
                            setSelectedStylist(stylist);
                            setWessSearch('');
                            setSelectedWessNames(stylist.wess_names || []);
                            setIsEditOpen(true);
                          }}
                          title="Edit Stylist"
                          aria-label={`Edit profile for stylist ${stylist.name}`}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-gray-400 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeleteError(null);
                            setSelectedStylist(stylist);
                            setIsDeleteOpen(true);
                          }}
                          title="Delete Stylist"
                          aria-label={`Delete profile for stylist ${stylist.name}`}
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

      {/* ------------------------------------------------------------------ */}
      {/* Add Stylist Dialog                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setWessSearch('');
            setSelectedWessNames([]);
            setAddError(null);
          }
        }}
      >
        <DialogContent className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full gap-0 select-none">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-gray-900 font-bold text-lg">Add New Stylist</DialogTitle>
              <DialogDescription className="text-gray-400 text-xs mt-1">
                Create a stylist account. They can immediately log in with their email and password.
              </DialogDescription>
            </DialogHeader>

            {addError && (
              <div className="mb-4 p-3 bg-destructive/5 text-destructive rounded-lg text-xs flex items-start gap-2 border border-destructive/15" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium">{addError}</span>
              </div>
            )}

            <div className="space-y-4 mb-5">
              <div className="space-y-1.5">
                <label htmlFor="add-name" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Full Name</label>
                <Input
                  id="add-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Bangsar Stylist"
                  className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                  disabled={isAddPending}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="add-email" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Email Address</label>
                <Input
                  id="add-email"
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. stylist@176avenue.com"
                  className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                  disabled={isAddPending}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="add-password" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Login Password</label>
                <Input
                  id="add-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                  disabled={isAddPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="add-role" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Role</label>
                  <select
                    id="add-role"
                    name="role"
                    required
                    defaultValue="stylist"
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900"
                    disabled={isAddPending}
                  >
                    <option value="stylist">Stylist</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="add-department" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Department</label>
                  <select
                    id="add-department"
                    name="department"
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900"
                    disabled={isAddPending}
                  >
                    <option value="">None (Admin/Unassigned)</option>
                    <option value="HAIR">Hair</option>
                    <option value="NAILS">Nails</option>
                    <option value="ARTISTRY_LASH">Artistry & Lash</option>
                  </select>
                </div>
              </div>

              <WessNameSelector
                transactionNames={transactionNames}
                selectedNames={selectedWessNames}
                onSelectionChange={setSelectedWessNames}
                searchValue={wessSearch}
                onSearchChange={setWessSearch}
                disabled={isAddPending}
              />
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
                disabled={isAddPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-black text-white hover:bg-slate-800 h-9 px-4 gap-1 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                disabled={isAddPending}
              >
                {isAddPending ? (
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

      {/* ------------------------------------------------------------------ */}
      {/* Edit Stylist Dialog                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedStylist(null);
            setWessSearch('');
            setSelectedWessNames([]);
            setEditError(null);
          }
        }}
      >
        <DialogContent className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full gap-0 select-none">
          {selectedStylist && (
            <form onSubmit={handleEditSubmit}>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-gray-900 font-bold text-lg">Edit Stylist Profile</DialogTitle>
                <DialogDescription className="text-gray-400 text-xs mt-1">
                  Modify the stylist&apos;s credentials or change their password.
                </DialogDescription>
              </DialogHeader>

              {editError && (
                <div className="mb-4 p-3 bg-destructive/5 text-destructive rounded-lg text-xs flex items-start gap-2 border border-destructive/15" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{editError}</span>
                </div>
              )}

              <div className="space-y-4 mb-5">
                <div className="space-y-1.5">
                  <label htmlFor="edit-name" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Full Name</label>
                  <Input
                    id="edit-name"
                    name="name"
                    type="text"
                    required
                    defaultValue={selectedStylist.name}
                    className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                    disabled={isEditPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-email" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Email Address</label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    required
                    defaultValue={selectedStylist.email}
                    className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                    disabled={isEditPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-password" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    New Password <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                  </label>
                  <Input
                    id="edit-password"
                    name="password"
                    type="password"
                    minLength={6}
                    placeholder="Leave blank to keep current"
                    className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                    disabled={isEditPending}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-role" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Role</label>
                    <select
                      id="edit-role"
                      name="role"
                      required
                      defaultValue={selectedStylist.role}
                      className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900"
                      disabled={isEditPending}
                    >
                      <option value="stylist">Stylist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit-department" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Department</label>
                    <select
                      id="edit-department"
                      name="department"
                      defaultValue={selectedStylist.department || ''}
                      className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900"
                      disabled={isEditPending}
                    >
                      <option value="">None (Admin/Unassigned)</option>
                      <option value="HAIR">Hair</option>
                      <option value="NAILS">Nails</option>
                      <option value="ARTISTRY_LASH">Artistry & Lash</option>
                    </select>
                  </div>
                </div>

                <WessNameSelector
                  transactionNames={transactionNames}
                  selectedNames={selectedWessNames}
                  onSelectionChange={setSelectedWessNames}
                  searchValue={wessSearch}
                  onSearchChange={setWessSearch}
                  disabled={isEditPending}
                />
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
                  disabled={isEditPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-black text-white hover:bg-slate-800 h-9 px-4 gap-1 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                  disabled={isEditPending}
                >
                  {isEditPending ? (
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

      {/* ------------------------------------------------------------------ */}
      {/* Delete Stylist Dialog                                               */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteOpen(false);
            setSelectedStylist(null);
            setDeleteError(null);
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

          {deleteError && (
            <div className="mb-4 p-3 bg-red-50 text-red-650 rounded-lg text-xs flex items-start gap-2 border border-red-100" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
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
              disabled={isDeletePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 hover:bg-red-750 text-white h-9 px-4 gap-1 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
              onClick={handleDeleteSubmit}
              disabled={isDeletePending}
            >
              {isDeletePending ? (
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
