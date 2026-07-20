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
import { Search, Plus, Edit, Trash2, User, Loader2, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
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

  // Filter stylists based on search query, role, and department
  const filteredStylists = initialStylists.filter((stylist) => {
    const matchesSearch =
      stylist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stylist.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stylist.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || stylist.role === roleFilter;

    const matchesDepartment =
      departmentFilter === 'all' ||
      (departmentFilter === 'unassigned' && !stylist.department) ||
      stylist.department === departmentFilter;

    return matchesSearch && matchesRole && matchesDepartment;
  });

  // Pagination calculations
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredStylists.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedStylists = filteredStylists.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, activePage - 1);
      let end = Math.min(totalPages - 1, activePage + 1);
      
      if (activePage <= 2) {
        end = 3;
      } else if (activePage >= totalPages - 1) {
        start = totalPages - 2;
      }
      
      if (start > 2) {
        pages.push('ellipsis-start');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

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
      {/* Search, Filters & Actions Bar */}
      <div className="flex flex-col lg:flex-row gap-3.5 justify-between items-start lg:items-center bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1 items-stretch sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search stylists..."
              className="pl-9 bg-gray-50/50 border-gray-200 focus-visible:bg-white w-full h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Search stylists by name, email, or username"
            />
          </div>

          <div className="flex flex-row gap-2.5 items-center w-full sm:w-auto">
            {/* Role Filter */}
            <div className="relative w-1/2 sm:w-36">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-3 pr-8 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 text-gray-900 appearance-none cursor-pointer"
                aria-label="Filter stylists by role"
              >
                <option value="all">All Roles</option>
                <option value="stylist">Stylists Only</option>
                <option value="admin">Admins Only</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Department Filter */}
            <div className="relative w-1/2 sm:w-44">
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-3 pr-8 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 text-gray-900 appearance-none cursor-pointer"
                aria-label="Filter stylists by department"
              >
                <option value="all">All Departments</option>
                <option value="HAIR">Hair</option>
                <option value="NAILS">Nails</option>
                <option value="ARTISTRY_LASH">Artistry & Lash</option>
                <option value="unassigned">None (Unassigned)</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setAddError(null);
            setWessSearch('');
            setSelectedWessNames([]);
            setIsAddOpen(true);
          }}
          className="w-full lg:w-auto bg-black text-white hover:bg-slate-800 gap-1.5 h-9 px-4 text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Add Stylist
        </Button>
      </div>

      {/* Stylists Table/Grid */}
      <Card className="border-gray-200 bg-white shadow-sm overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          {paginatedStylists.length > 0 ? (
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
                {paginatedStylists.map((stylist) => (
                  <tr key={stylist.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 text-gray-700 font-bold text-xs select-none">
                          {stylist.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm">{stylist.name}</span>
                            <span className="text-[10px] font-bold text-gray-450 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150 select-all">
                              @{stylist.username}
                            </span>
                          </div>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-150 bg-gray-50/20 text-xs text-gray-500 select-none">
            {/* Mobile Layout */}
            <div className="flex flex-row justify-between w-full sm:hidden gap-3.5">
              <Button
                variant="outline"
                className="w-1/2 h-10 border-gray-200 text-gray-700 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer bg-white"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                className="w-1/2 h-10 border-gray-200 text-gray-700 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer bg-white"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
              <div>
                <p className="text-xs text-gray-500 font-medium">
                  Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-gray-900">
                    {Math.min(endIndex, filteredStylists.length)}
                  </span>{' '}
                  of <span className="font-semibold text-gray-900">{filteredStylists.length}</span> stylists
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 cursor-pointer bg-white"
                  onClick={() => setCurrentPage(1)}
                  disabled={activePage === 1}
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 cursor-pointer bg-white"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={activePage === 1}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                {getPageNumbers().map((page, idx) => {
                  if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 select-none text-xs font-semibold"
                      >
                        ...
                      </span>
                    );
                  }

                  const isCurrent = activePage === page;
                  return (
                    <Button
                      key={page}
                      variant={isCurrent ? 'default' : 'outline'}
                      size="icon-sm"
                      className={
                        isCurrent
                          ? 'bg-black text-white hover:bg-slate-800 font-bold border-black cursor-pointer'
                          : 'border-gray-200 text-gray-600 hover:text-black hover:bg-gray-50 font-medium cursor-pointer bg-white'
                      }
                      onClick={() => setCurrentPage(page as number)}
                    >
                      {page}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="icon-sm"
                  className="border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 cursor-pointer bg-white"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={activePage === totalPages}
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 cursor-pointer bg-white"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={activePage === totalPages}
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
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
        <DialogContent className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg w-full gap-0 select-none">
          <form onSubmit={handleAddSubmit}>
            {/* Dummy inputs to capture autofill */}
            <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
              <input type="text" tabIndex={-1} autoComplete="username" />
              <input type="password" tabIndex={-1} autoComplete="current-password" />
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 mb-5">
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
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="add-username" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Username</label>
                <Input
                  id="add-username"
                  name="username"
                  type="text"
                  required
                  placeholder="e.g. bangsar_stylist"
                  className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                  disabled={isAddPending}
                  autoComplete="new-username"
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
                  autoComplete="new-email"
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
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="add-role" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Role</label>
                <div className="relative">
                  <select
                    id="add-role"
                    name="role"
                    required
                    defaultValue="stylist"
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-3 pr-8 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900 appearance-none cursor-pointer"
                    disabled={isAddPending}
                  >
                    <option value="stylist">Stylist</option>
                    <option value="admin">Admin</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="add-department" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Department</label>
                <div className="relative">
                  <select
                    id="add-department"
                    name="department"
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-3 pr-8 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900 appearance-none cursor-pointer"
                    disabled={isAddPending}
                  >
                    <option value="">None (Admin/Unassigned)</option>
                    <option value="HAIR">Hair</option>
                    <option value="NAILS">Nails</option>
                    <option value="ARTISTRY_LASH">Artistry & Lash</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2 mt-1">
                <WessNameSelector
                  transactionNames={transactionNames}
                  selectedNames={selectedWessNames}
                  onSelectionChange={setSelectedWessNames}
                  searchValue={wessSearch}
                  onSearchChange={setWessSearch}
                  disabled={isAddPending}
                />
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
        <DialogContent className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg w-full gap-0 select-none">
          {selectedStylist && (
            <form onSubmit={handleEditSubmit}>
              {/* Dummy inputs to capture autofill */}
              <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
                <input type="text" tabIndex={-1} autoComplete="username" />
                <input type="password" tabIndex={-1} autoComplete="current-password" />
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 mb-5">
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
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-username" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Username</label>
                  <Input
                    id="edit-username"
                    name="username"
                    type="text"
                    required
                    defaultValue={selectedStylist.username}
                    className="bg-gray-50/50 border-gray-200 h-9 text-xs focus-visible:border-black focus-visible:ring-black/5"
                    disabled={isEditPending}
                    autoComplete="new-username"
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
                    autoComplete="new-email"
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
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-role" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Role</label>
                  <div className="relative">
                    <select
                      id="edit-role"
                      name="role"
                      required
                      defaultValue={selectedStylist.role}
                      className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-3 pr-8 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900 appearance-none cursor-pointer"
                      disabled={isEditPending}
                    >
                      <option value="stylist">Stylist</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-department" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Department</label>
                  <div className="relative">
                    <select
                      id="edit-department"
                      name="department"
                      defaultValue={selectedStylist.department || ''}
                      className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-3 pr-8 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900 appearance-none cursor-pointer"
                      disabled={isEditPending}
                    >
                      <option value="">None (Admin/Unassigned)</option>
                      <option value="HAIR">Hair</option>
                      <option value="NAILS">Nails</option>
                      <option value="ARTISTRY_LASH">Artistry & Lash</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="sm:col-span-2 mt-1">
                  <WessNameSelector
                    transactionNames={transactionNames}
                    selectedNames={selectedWessNames}
                    onSelectionChange={setSelectedWessNames}
                    searchValue={wessSearch}
                    onSearchChange={setWessSearch}
                    disabled={isEditPending}
                  />
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
