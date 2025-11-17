import { createClient as createSupabaseClient, Session, User, AuthError } from '@supabase/supabase-js'
import type {
  Trip,
  TripInsert,
  TripUpdate,
  Expense,
  ExpenseInsert,
  ExpenseUpdate,
  SupabaseSingleResponse,
  SupabaseArrayResponse,
} from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Export a function to create client (for custom configurations)
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  getSession: async () => {
    return await supabase.auth.getSession()
  },

  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },
}

// Database helpers
export const db = {
  // Trips
  trips: {
    getAll: async (userId: string): Promise<SupabaseArrayResponse<Trip>> => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      return { data, error }
    },

    getById: async (id: string): Promise<SupabaseSingleResponse<Trip>> => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single()
      return { data, error }
    },

    create: async (trip: TripInsert): Promise<SupabaseSingleResponse<Trip>> => {
      const { data, error } = await supabase
        .from('trips')
        .insert(trip)
        .select()
        .single()
      return { data, error }
    },

    update: async (id: string, updates: TripUpdate): Promise<SupabaseSingleResponse<Trip>> => {
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    },

    delete: async (id: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id)
      return { error }
    },
  },

  // Expenses
  expenses: {
    getByTrip: async (tripId: string): Promise<SupabaseArrayResponse<Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false })
      return { data, error }
    },

    getById: async (id: string): Promise<SupabaseSingleResponse<Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single()
      return { data, error }
    },

    create: async (expense: ExpenseInsert): Promise<SupabaseSingleResponse<Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single()
      return { data, error }
    },

    update: async (id: string, updates: ExpenseUpdate): Promise<SupabaseSingleResponse<Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    },

    delete: async (id: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
      return { error }
    },
  },
}
