-- MASTER SETUP SCRIPT FOR LABOUR HUB
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- ==========================================
-- 1. CLEANUP (OPTIONAL - UNCOMMENT IF YOU WANT A FULL RESET)
-- WARN: THIS WILL DELETE ALL DATA
-- ==========================================
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP FUNCTION IF EXISTS public.has_role(uuid, text);
-- DROP TABLE IF EXISTS public.labour_ledger CASCADE;
-- DROP TABLE IF EXISTS public.work_entries CASCADE;
-- DROP TABLE IF EXISTS public.labourers CASCADE;
-- DROP TABLE IF EXISTS public.user_roles CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==========================================
-- 2. UTILITY FUNCTIONS
-- ==========================================

-- Function to check roles safely (SECURITY DEFINER to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;

-- ==========================================
-- 3. TABLE DEFINITIONS
-- ==========================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'labourer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, role)
);

-- LABOURERS
CREATE TABLE IF NOT EXISTS public.labourers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- specific auth user if they have a login
    name TEXT NOT NULL,
    phone_number TEXT,
    skills TEXT[],
    status TEXT DEFAUlT 'available' CHECK (status IN ('available', 'busy', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- WORK ENTRIES
CREATE TABLE IF NOT EXISTS public.work_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
    group_id UUID,
    supervisor_id UUID REFERENCES auth.users(id),
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    location TEXT,
    task_type TEXT,
    meters NUMERIC(10,2),
    hours NUMERIC(10,2),
    amount NUMERIC(10,2),
    description TEXT,
    flag_reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'flagged')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- LABOUR LEDGER (Financials)
CREATE TABLE IF NOT EXISTS public.labour_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')), -- CREDIT = Owes labourer money, DEBIT = Paid labourer
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- Can link to work_entries.id if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==========================================
-- 4. ENABLE RLS
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labourers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_ledger ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. RLS POLICIES
-- ==========================================

-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- USER ROLES
-- Users can see their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Supervisors/Admins can manage roles (using has_role to avoid recursion)
DROP POLICY IF EXISTS "Admins/Supervisors can view all roles" ON public.user_roles;
CREATE POLICY "Admins/Supervisors can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- LABOURERS
-- Supervisors/Admins can do everything
DROP POLICY IF EXISTS "Supervisors manage labourers" ON public.labourers;
CREATE POLICY "Supervisors manage labourers" ON public.labourers
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));
  
-- WORK ENTRIES
DROP POLICY IF EXISTS "Supervisors manage work" ON public.work_entries;
CREATE POLICY "Supervisors manage work" ON public.work_entries
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- LEDGER
DROP POLICY IF EXISTS "Supervisors manage ledger" ON public.labour_ledger;
CREATE POLICY "Supervisors manage ledger" ON public.labour_ledger
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- ==========================================
-- 6. AUTOMATION TRIGGERS
-- ==========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');

  -- 2. Assign Default Role (Supervisor for first user or logic based on metadata)
  -- For now, default everyone to 'supervisor' if specific metadata key is present, otherwise 'labourer' or null
  -- HEURISTIC: If it's the very first user, make them admin/supervisor? 
  -- SIMPLER: Just make everyone a supervisor for this app's context based on user request "I am supervisor"
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'supervisor'); 

  RETURN new;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
