export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  role?: 'owner' | 'admin' | 'member';
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at?: string;
  profiles?: Profile;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
  is_system?: boolean;
  group_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  syncStatus?: 'synced' | 'pending_insert';
}

export interface Transaction {
  id: string;
  group_id: string;
  category_id?: string | null;
  type: 'income' | 'expense';
  amount: number;
  description?: string | null;
  transaction_date: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  local_id?: string;
  syncStatus?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
  categories?: Category | null;
  profiles?: {
    name: string;
    email: string;
  } | null;
}
