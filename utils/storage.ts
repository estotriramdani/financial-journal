import { Category, Group, Transaction } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

const TX_KEY = 'finjrnl_local_transactions';
const CAT_KEY = 'finjrnl_local_categories';
const GRP_KEY = 'finjrnl_local_groups';
const ACTIVE_GRP_KEY = 'finjrnl_active_group_id';

// Helper for safe localStorage access in SSR
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    console.error(`Failed to read ${key} from localStorage`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write ${key} to localStorage`, e);
  }
}

export function notifySyncListeners(detail?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finjrnl:data-changed', { detail }));
  }
}

// ------------------- Active Group -------------------
export function getActiveGroupId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_GRP_KEY);
}

export function setActiveGroupId(groupId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_GRP_KEY, groupId);
  notifySyncListeners({ type: 'group_changed', groupId });
}

// ------------------- Groups -------------------
export function getLocalGroups(): Group[] {
  return getItem<Group[]>(GRP_KEY, []);
}

export function saveLocalGroups(groups: Group[]): void {
  setItem(GRP_KEY, groups);
  notifySyncListeners({ type: 'groups_updated' });
}

export function updateLocalGroup(updatedGroup: Partial<Group> & { id: string }): void {
  const groups = getItem<Group[]>(GRP_KEY, []);
  const idx = groups.findIndex((g) => g.id === updatedGroup.id);
  if (idx >= 0) {
    groups[idx] = { ...groups[idx], ...updatedGroup };
    setItem(GRP_KEY, groups);
    notifySyncListeners({ type: 'groups_updated' });
  }
}

export function deleteLocalGroup(groupId: string): void {
  const groups = getItem<Group[]>(GRP_KEY, []).filter((g) => g.id !== groupId);
  setItem(GRP_KEY, groups);

  // Clean up associated transactions and custom categories locally
  const txs = getItem<Transaction[]>(TX_KEY, []).filter((t) => t.group_id !== groupId);
  setItem(TX_KEY, txs);

  const cats = getItem<Category[]>(CAT_KEY, []).filter((c) => c.group_id !== groupId);
  setItem(CAT_KEY, cats);

  const activeId = getActiveGroupId();
  if (activeId === groupId) {
    const nextGroup = groups.length > 0 ? groups[0] : null;
    if (nextGroup) {
      setActiveGroupId(nextGroup.id);
    } else {
      localStorage.removeItem(ACTIVE_GRP_KEY);
    }
  }

  notifySyncListeners({ type: 'groups_updated' });
}

// ------------------- Categories -------------------
export function getLocalCategories(groupId?: string | null): Category[] {
  const cats = getItem<Category[]>(CAT_KEY, []);
  if (!groupId) return cats;
  return cats.filter(
    (c) => c.is_system || !c.group_id || c.group_id === groupId
  );
}

export function saveLocalCategory(cat: Category): Category {
  const cats = getItem<Category[]>(CAT_KEY, []);
  const existingIdx = cats.findIndex((c) => c.id === cat.id);
  if (existingIdx >= 0) {
    cats[existingIdx] = cat;
  } else {
    cats.push(cat);
  }
  setItem(CAT_KEY, cats);
  notifySyncListeners({ type: 'category_saved', category: cat });
  return cat;
}

export function setLocalCategories(cats: Category[]): void {
  setItem(CAT_KEY, cats);
  notifySyncListeners({ type: 'categories_updated' });
}

// ------------------- Transactions -------------------
export function getLocalTransactions(groupId?: string | null): Transaction[] {
  const txs = getItem<Transaction[]>(TX_KEY, []);
  const filtered = groupId ? txs.filter((t) => t.group_id === groupId) : txs;
  return filtered.sort((a, b) => {
    // Sort by date desc, then created_at desc
    const dateCmp = (b.transaction_date || '').localeCompare(a.transaction_date || '');
    if (dateCmp !== 0) return dateCmp;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
}

export function saveLocalTransaction(tx: Transaction): Transaction {
  const txs = getItem<Transaction[]>(TX_KEY, []);
  const existingIdx = txs.findIndex((t) => t.id === tx.id || (tx.local_id && t.local_id === tx.local_id));
  
  if (existingIdx >= 0) {
    txs[existingIdx] = { ...txs[existingIdx], ...tx };
  } else {
    txs.unshift(tx);
  }
  setItem(TX_KEY, txs);
  notifySyncListeners({ type: 'transaction_saved', transaction: tx });
  return tx;
}

export function deleteLocalTransaction(id: string): void {
  const txs = getItem<Transaction[]>(TX_KEY, []);
  const tx = txs.find((t) => t.id === id);
  if (!tx) return;

  if (tx.syncStatus === 'pending_insert') {
    // Has not reached server, simply delete locally
    const filtered = txs.filter((t) => t.id !== id);
    setItem(TX_KEY, filtered);
  } else {
    // Needs to be deleted on server
    tx.syncStatus = 'pending_delete';
    setItem(TX_KEY, txs);
  }
  notifySyncListeners({ type: 'transaction_deleted', id });
}

export function getPendingSyncCount(): number {
  const txs = getItem<Transaction[]>(TX_KEY, []);
  const cats = getItem<Category[]>(CAT_KEY, []);
  const pendingTx = txs.filter((t) => t.syncStatus && t.syncStatus !== 'synced').length;
  const pendingCat = cats.filter((c) => c.syncStatus && c.syncStatus !== 'synced').length;
  return pendingTx + pendingCat;
}

// ------------------- Sync Engine -------------------
let isSyncing = false;

export async function syncData(supabase: SupabaseClient, activeGroupId?: string | null): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: false, syncedCount: 0, error: 'Offline' };
  }

  if (isSyncing) {
    return { success: true, syncedCount: 0 };
  }

  isSyncing = true;
  notifySyncListeners({ type: 'sync_start' });

  let syncedCount = 0;

  try {
    // 1. Sync pending categories
    const localCats = getItem<Category[]>(CAT_KEY, []);
    for (let i = 0; i < localCats.length; i++) {
      const cat = localCats[i];
      if (cat.syncStatus === 'pending_insert') {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            id: cat.id,
            name: cat.name,
            type: cat.type,
            icon: cat.icon || null,
            color: cat.color || null,
            is_system: cat.is_system || false,
            group_id: cat.group_id || null,
            created_by: cat.created_by || null,
          })
          .select()
          .single();

        if (!error && data) {
          localCats[i] = { ...data, syncStatus: 'synced' };
          syncedCount++;
        }
      }
    }
    setItem(CAT_KEY, localCats);

    // 2. Sync pending transactions
    const localTxs = getItem<Transaction[]>(TX_KEY, []);
    const remainingTxs: Transaction[] = [];

    for (const tx of localTxs) {
      if (tx.syncStatus === 'pending_insert') {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            id: tx.id,
            group_id: tx.group_id,
            category_id: tx.category_id || null,
            type: tx.type,
            amount: tx.amount,
            description: tx.description || null,
            transaction_date: tx.transaction_date,
            created_by: tx.created_by,
          })
          .select('*, categories(*), profiles(name, email)')
          .single();

        if (!error && data) {
          remainingTxs.push({ ...data, syncStatus: 'synced' });
          syncedCount++;
        } else {
          // Keep as pending
          remainingTxs.push(tx);
        }
      } else if (tx.syncStatus === 'pending_update') {
        const { data, error } = await supabase
          .from('transactions')
          .update({
            category_id: tx.category_id || null,
            type: tx.type,
            amount: tx.amount,
            description: tx.description || null,
            transaction_date: tx.transaction_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tx.id)
          .select('*, categories(*), profiles(name, email)')
          .single();

        if (!error && data) {
          remainingTxs.push({ ...data, syncStatus: 'synced' });
          syncedCount++;
        } else {
          remainingTxs.push(tx);
        }
      } else if (tx.syncStatus === 'pending_delete') {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', tx.id);

        if (!error) {
          // Successfully deleted from server, drop from local list
          syncedCount++;
        } else {
          remainingTxs.push(tx);
        }
      } else {
        remainingTxs.push(tx);
      }
    }
    setItem(TX_KEY, remainingTxs);

    // 3. Fetch fresh groups from server
    const { data: serverGroups } = await supabase
      .from('groups')
      .select('*, group_members!inner(user_id, role)')
      .order('created_at', { ascending: true });

    if (serverGroups && serverGroups.length > 0) {
      const mappedGroups: Group[] = serverGroups.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        created_by: g.created_by,
        created_at: g.created_at,
        role: g.group_members?.[0]?.role || 'member',
      }));
      saveLocalGroups(mappedGroups);

      // Default active group if not set
      const currentActive = getActiveGroupId();
      if (!currentActive || !mappedGroups.find((g) => g.id === currentActive)) {
        setActiveGroupId(mappedGroups[0].id);
      }
    }

    // 4. Fetch fresh categories from server
    const { data: serverCats } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (serverCats) {
      // Merge: preserve any local items still pending
      const pendingCats = localCats.filter((c) => c.syncStatus === 'pending_insert');
      const mergedCats = [...serverCats.map((c: any) => ({ ...c, syncStatus: 'synced' }))];
      for (const p of pendingCats) {
        if (!mergedCats.some((m) => m.id === p.id)) {
          mergedCats.push(p);
        }
      }
      setItem(CAT_KEY, mergedCats);
    }

    // 5. Fetch fresh transactions for active group
    const targetGroupId = activeGroupId || getActiveGroupId();
    if (targetGroupId) {
      const { data: serverTxs } = await supabase
        .from('transactions')
        .select('*, categories(*), profiles(name, email)')
        .eq('group_id', targetGroupId)
        .order('transaction_date', { ascending: false })
        .limit(200);

      if (serverTxs) {
        const currentLocal = getItem<Transaction[]>(TX_KEY, []);
        // Retain pending transactions for all groups
        const pendingTxs = currentLocal.filter((t) => t.syncStatus && t.syncStatus !== 'synced');
        // Filter out non-target group server transactions already saved locally
        const otherGroupsTxs = currentLocal.filter((t) => t.group_id !== targetGroupId && t.syncStatus === 'synced');

        const mergedTxs = [
          ...serverTxs.map((t: any) => ({ ...t, syncStatus: 'synced' as const })),
          ...otherGroupsTxs,
          ...pendingTxs.filter((p) => !serverTxs.some((s: any) => s.id === p.id)),
        ];

        setItem(TX_KEY, mergedTxs);
      }
    }

    notifySyncListeners({ type: 'sync_complete', syncedCount });
    return { success: true, syncedCount };
  } catch (err: any) {
    console.error('Sync failed:', err);
    notifySyncListeners({ type: 'sync_error', error: err.message });
    return { success: false, syncedCount, error: err.message };
  } finally {
    isSyncing = false;
  }
}
