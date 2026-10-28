'use client';

import React, { useState, useEffect } from 'react';
import { Group, GroupMember, Profile } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { Plus, UserPlus, UserMinus, Crown, Pencil, Trash2, AlertTriangle, X } from 'lucide-react';
import { getLocalGroups, saveLocalGroups, setActiveGroupId, updateLocalGroup, deleteLocalGroup } from '@/utils/storage';
import { useDialog } from '@/context/DialogContext';

interface GroupManagementProps {
  currentGroup: Group | null;
  currentUser: Profile | null;
  onGroupSelected: (group: Group) => void;
}

export function GroupManagement({
  currentGroup,
  currentUser,
  onGroupSelected,
}: GroupManagementProps) {
  const { showConfirm } = useDialog();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit group state
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  // Delete group modal state
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const supabase = createClient();

  // Load user groups from local / remote
  const loadGroups = async () => {
    const local = getLocalGroups();
    setGroups(local);

    if (currentUser) {
      const { data } = await supabase
        .from('groups')
        .select('*, group_members!inner(user_id, role)')
        .order('created_at', { ascending: true });

      if (data) {
        const mapped: Group[] = data.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          created_by: g.created_by,
          created_at: g.created_at,
          role: g.group_members?.[0]?.role || 'member',
        }));
        setGroups(mapped);
        saveLocalGroups(mapped);
      }
    }
  };

  // Load members of active group
  const loadMembers = async (groupId: string) => {
    setIsLoadingMembers(true);
    try {
      const { data } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, role, joined_at, profiles(id, name, email, role)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (data) {
        setMembers(data as any);
      }
    } catch (e) {
      console.error('Failed to load group members:', e);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [currentUser]);

  useEffect(() => {
    if (currentGroup?.id) {
      loadMembers(currentGroup.id);
    }
  }, [currentGroup?.id]);

  // Create new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser) return;

    try {
      const { data: newGroup, error: groupErr } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || null,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (groupErr) throw groupErr;

      // Ensure user membership is recorded as owner
      await supabase
        .from('group_members')
        .upsert(
          {
            group_id: newGroup.id,
            user_id: currentUser.id,
            role: 'owner',
          },
          { onConflict: 'group_id,user_id' }
        );

      const created: Group = {
        ...newGroup,
        role: 'owner',
      };

      const updated = [...groups, created];
      setGroups(updated);
      saveLocalGroups(updated);
      setActiveGroupId(created.id);
      onGroupSelected(created);
      loadMembers(created.id);

      setNewGroupName('');
      setNewGroupDesc('');
      setIsCreatingGroup(false);
      setActionMessage({ type: 'success', text: `Grup "${created.name}" berhasil dibuat!` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal membuat grup' });
    }
  };

  // Add member by email
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentGroup) return;

    setActionMessage(null);
    try {
      // 1. Find profile by email
      const { data: targetProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('email', inviteEmail.trim().toLowerCase())
        .single();

      if (profileErr || !targetProfile) {
        setActionMessage({
          type: 'error',
          text: `User dengan email "${inviteEmail}" tidak ditemukan. Pastikan user sudah mendaftar.`,
        });
        return;
      }

      // 2. Check if already member
      const isAlready = members.some((m) => m.user_id === targetProfile.id);
      if (isAlready) {
        setActionMessage({ type: 'error', text: 'User sudah menjadi anggota grup ini.' });
        return;
      }

      // 3. Add to group_members
      const { data: newMember, error: insertErr } = await supabase
        .from('group_members')
        .insert({
          group_id: currentGroup.id,
          user_id: targetProfile.id,
          role: 'member',
        })
        .select('id, group_id, user_id, role, joined_at, profiles(id, name, email, role)')
        .single();

      if (insertErr) throw insertErr;

      setMembers((prev) => [...prev, newMember as any]);
      setInviteEmail('');
      setActionMessage({
        type: 'success',
        text: `Berhasil menambahkan ${targetProfile.name || targetProfile.email} ke grup!`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal menambahkan anggota' });
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string, memberUserId: string, memberName: string) => {
    if (!currentGroup) return;
    const confirmed = await showConfirm({
      title: 'Keluarkan Anggota?',
      message: `Apakah Anda yakin ingin mengeluarkan "${memberName}" dari grup "${currentGroup.name}"?`,
      variant: 'danger',
      confirmText: 'Ya, Keluarkan',
      cancelText: 'Batal',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setActionMessage({ type: 'success', text: `Anggota berhasil dikeluarkan dari grup.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal menghapus anggota' });
    }
  };

  // Open edit modal / form
  const handleOpenEdit = (group: Group) => {
    setEditGroupName(group.name);
    setEditGroupDesc(group.description || '');
    setIsEditingGroup(true);
    setActionMessage(null);
  };

  // Submit group update
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup || !editGroupName.trim()) return;

    setIsUpdatingGroup(true);
    setActionMessage(null);
    try {
      const { data, error } = await supabase
        .from('groups')
        .update({
          name: editGroupName.trim(),
          description: editGroupDesc.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentGroup.id)
        .select()
        .single();

      if (error) throw error;

      const updated: Group = {
        ...currentGroup,
        name: editGroupName.trim(),
        description: editGroupDesc.trim() || null,
      };

      updateLocalGroup(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      onGroupSelected(updated);
      setIsEditingGroup(false);
      setActionMessage({ type: 'success', text: `Grup "${updated.name}" berhasil diperbarui!` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal memperbarui grup' });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Submit group deletion
  const handleDeleteGroup = async (group: Group) => {
    setIsDeletingLoading(true);
    setActionMessage(null);
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;

      deleteLocalGroup(group.id);
      const remaining = groups.filter((g) => g.id !== group.id);
      setGroups(remaining);

      if (currentGroup?.id === group.id) {
        if (remaining.length > 0) {
          onGroupSelected(remaining[0]);
        }
      }

      setGroupToDelete(null);
      setActionMessage({ type: 'success', text: `Grup "${group.name}" berhasil dihapus secara permanen.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Gagal menghapus grup' });
    } finally {
      setIsDeletingLoading(false);
    }
  };

  const isCurrentGroupAdminOrOwner =
    currentGroup?.role === 'owner' ||
    currentGroup?.role === 'admin' ||
    currentGroup?.created_by === currentUser?.id ||
    currentUser?.role === 'admin' ||
    members.some((m) => m.user_id === currentUser?.id && (m.role === 'owner' || m.role === 'admin'));

  return (
    <div className="space-y-6 page-transition pb-20">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider">
            Kolaborasi Jurnal
          </span>
          <h2 className="text-2xl font-black text-[#100f0f] dark:text-[#fffdf6]">Kelola Grup Keuangan</h2>
        </div>
        <button
          onClick={() => setIsCreatingGroup(!isCreatingGroup)}
          className="px-4 py-2 bg-[#100f0f] dark:bg-[#e4e24e] text-[#fffdf6] dark:text-[#100f0f] rounded-full text-xs font-bold flex items-center gap-1.5 active-press shadow-xs hover:bg-black"
        >
          <Plus size={16} />
          <span>Buat Grup Baru</span>
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold ${
            actionMessage.type === 'success'
              ? 'bg-[#faf9b6] dark:bg-[#282717] text-[#100f0f] dark:text-[#e4e24e] border border-[#100f0f]/20 dark:border-[#e4e24e]/30'
              : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Create Group Form */}
      {isCreatingGroup && (
        <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-sm space-y-4 page-transition">
          <h3 className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6] uppercase tracking-wider">
            Buat Grup Baru
          </h3>
          <form onSubmit={handleCreateGroup} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] block mb-1">
                Nama Grup
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Keuangan Keluarga, Usaha Bersama, Trip Bali"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-4 py-3 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-sm font-medium text-[#100f0f] dark:text-[#fffdf6] focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] block mb-1">
                Deskripsi (Opsional)
              </label>
              <input
                type="text"
                placeholder="Deskripsi singkat tujuan grup"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="w-full px-4 py-3 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-sm font-medium text-[#100f0f] dark:text-[#fffdf6] focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-[#e4e24e] text-[#100f0f] font-bold text-xs uppercase tracking-wider rounded-full active-press hover:bg-[#d8d645]"
              >
                Simpan & Aktifkan Grup
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="px-5 py-3 border border-[#100f0f]/20 dark:border-white/15 rounded-full text-xs font-bold text-[#100f0f] dark:text-[#fffdf6] active-press hover:bg-black/5 dark:hover:bg-white/5"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Group Form */}
      {isEditingGroup && currentGroup && (
        <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 shadow-sm space-y-4 page-transition">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#100f0f] dark:text-[#fffdf6] uppercase tracking-wider flex items-center gap-1.5">
              <Pencil size={15} />
              <span>Edit Grup: {currentGroup.name}</span>
            </h3>
            <button
              onClick={() => setIsEditingGroup(false)}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#64635c] dark:text-[#8e8d85]"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleUpdateGroup} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] block mb-1">
                Nama Grup
              </label>
              <input
                type="text"
                required
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                className="w-full px-4 py-3 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-sm font-medium text-[#100f0f] dark:text-[#fffdf6] focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] block mb-1">
                Deskripsi (Opsional)
              </label>
              <input
                type="text"
                value={editGroupDesc}
                onChange={(e) => setEditGroupDesc(e.target.value)}
                className="w-full px-4 py-3 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-sm font-medium text-[#100f0f] dark:text-[#fffdf6] focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isUpdatingGroup}
                className="flex-1 py-3 bg-[#e4e24e] text-[#100f0f] font-bold text-xs uppercase tracking-wider rounded-full active-press hover:bg-[#d8d645] disabled:opacity-50"
              >
                {isUpdatingGroup ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingGroup(false)}
                className="px-5 py-3 border border-[#100f0f]/20 dark:border-white/15 rounded-full text-xs font-bold text-[#100f0f] dark:text-[#fffdf6] active-press hover:bg-black/5 dark:hover:bg-white/5"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of user's groups */}
      <div>
        <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block mb-2">
          Grup Anda (Klik untuk berganti grup aktif)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((group) => {
            const isActive = currentGroup?.id === group.id;
            const canManage =
              group.role === 'owner' ||
              group.role === 'admin' ||
              group.created_by === currentUser?.id ||
              currentUser?.role === 'admin';

            return (
              <div
                key={group.id}
                onClick={() => {
                  setActiveGroupId(group.id);
                  onGroupSelected(group);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all active-press ${
                  isActive
                    ? 'bg-[#100f0f] dark:bg-white/15 text-[#fffdf6] border-[#100f0f] dark:border-white/20 shadow-md'
                    : 'bg-white dark:bg-[#1a1919] hover:border-[#100f0f]/40 dark:hover:border-white/25 text-[#100f0f] dark:text-[#fffdf6] border-[#100f0f]/15 dark:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-base truncate">{group.name}</span>
                  {isActive && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#e4e24e] text-[#100f0f] rounded-full">
                      Aktif
                    </span>
                  )}
                </div>
                {group.description && (
                  <p className={`text-xs truncate ${isActive ? 'text-gray-300' : 'text-[#64635c] dark:text-[#8e8d85]'}`}>
                    {group.description}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-black/10 dark:border-white/10 text-[11px]">
                  <span className={`capitalize font-semibold ${isActive ? 'text-[#e4e24e]' : 'text-[#100f0f] dark:text-[#e4e24e]'}`}>
                    Peran: {group.role || 'Member'}
                  </span>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGroupSelected(group);
                          handleOpenEdit(group);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'text-white hover:bg-white/20'
                            : 'text-[#64635c] dark:text-[#8e8d85] hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                        title="Edit Grup"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGroupToDelete(group);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Hapus Grup"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Group Members Section */}
      {currentGroup && (
        <div className="p-5 bg-white dark:bg-[#1a1919] rounded-3xl border border-[#100f0f]/15 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#100f0f]/10 dark:border-white/10 gap-2">
            <div>
              <span className="text-[11px] font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider">
                Anggota Grup: {currentGroup.name}
              </span>
              <h3 className="text-lg font-black text-[#100f0f] dark:text-[#fffdf6]">
                Daftar Kolaborator ({members.length})
              </h3>
            </div>

            {isCurrentGroupAdminOrOwner && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentGroup)}
                  className="px-3 py-1.5 bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/15 text-[#100f0f] dark:text-[#fffdf6] rounded-xl text-xs font-bold flex items-center gap-1.5 active-press transition-colors"
                  title="Edit Nama & Deskripsi Grup"
                >
                  <Pencil size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGroupToDelete(currentGroup)}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 active-press transition-colors"
                  title="Hapus Grup"
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>

          {/* Add member form (owner/admin only) */}
          {isCurrentGroupAdminOrOwner && (
            <form onSubmit={handleAddMember} className="space-y-2">
              <label className="text-xs font-semibold text-[#64635c] dark:text-[#8e8d85] uppercase tracking-wider block">
                Undang Pengguna Baru ke Grup Ini
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Masukkan email pengguna (cth: teman@gmail.com)"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#fffdf6] dark:bg-[#100f0f] border border-[#100f0f]/20 dark:border-white/15 rounded-2xl text-xs font-medium text-[#100f0f] dark:text-[#fffdf6] focus:outline-hidden focus:border-[#100f0f] dark:focus:border-[#e4e24e]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#e4e24e] text-[#100f0f] font-bold text-xs rounded-2xl flex items-center gap-1 active-press hover:bg-[#d8d645] shrink-0"
                >
                  <UserPlus size={16} />
                  <span>Tambah</span>
                </button>
              </div>
              <p className="text-[11px] text-[#64635c] dark:text-[#8e8d85]">
                * Pengguna yang diundang harus sudah memiliki akun FINJRNL.
              </p>
            </form>
          )}

          {/* Members List */}
          <div className="space-y-2 pt-2">
            {isLoadingMembers ? (
              <p className="text-xs text-[#64635c] dark:text-[#8e8d85] text-center py-4">Memuat anggota...</p>
            ) : members.length === 0 ? (
              <p className="text-xs text-[#64635c] dark:text-[#8e8d85] text-center py-4">Belum ada anggota.</p>
            ) : (
              members.map((member) => {
                const profile = member.profiles;
                const isOwner = member.role === 'owner';
                const isMe = member.user_id === currentUser?.id;

                return (
                  <div
                    key={member.id}
                    className="p-3 bg-[#fffdf6] dark:bg-[#100f0f] rounded-2xl border border-[#100f0f]/10 dark:border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#100f0f] dark:bg-[#e4e24e] text-[#e4e24e] dark:text-[#100f0f] font-black text-sm flex items-center justify-center shrink-0">
                        {(profile?.name || profile?.email || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#100f0f] dark:text-[#fffdf6] truncate">
                            {profile?.name || 'Tanpa Nama'} {isMe && '(Anda)'}
                          </span>
                          {isOwner && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-[#faf9b6] dark:bg-[#e4e24e]/20 text-[#100f0f] dark:text-[#e4e24e] rounded-full border border-[#100f0f]/20 dark:border-[#e4e24e]/30">
                              <Crown size={10} /> Owner
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#64635c] dark:text-[#8e8d85] truncate block">
                          {profile?.email}
                        </span>
                      </div>
                    </div>

                    {/* Remove Action */}
                    {isCurrentGroupAdminOrOwner && !isOwner && !isMe && (
                      <button
                        onClick={() =>
                          handleRemoveMember(
                            member.id,
                            member.user_id,
                            profile?.name || profile?.email || 'User'
                          )
                        }
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors active-press"
                        title="Keluarkan dari grup"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {/* Delete Group Confirmation Modal */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs page-transition">
          <div className="w-full max-w-sm bg-white dark:bg-[#171616] rounded-3xl border border-[#100f0f]/15 dark:border-white/15 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-[#100f0f] dark:text-[#fffdf6]">
                Hapus Grup "{groupToDelete.name}"?
              </h3>
              <p className="text-xs text-[#64635c] dark:text-[#8e8d85] mt-1.5 leading-relaxed">
                Semua catatan transaksi, kategori khusus, dan akses anggota dalam grup ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                disabled={isDeletingLoading}
                className="flex-1 py-2.5 bg-[#100f0f]/5 hover:bg-[#100f0f]/10 dark:bg-white/10 dark:hover:bg-white/15 text-[#100f0f] dark:text-[#fffdf6] text-xs font-bold rounded-2xl active-press"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGroup(groupToDelete)}
                disabled={isDeletingLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-2xl active-press disabled:opacity-50"
              >
                {isDeletingLoading ? 'Menghapus...' : 'Ya, Hapus Grup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
