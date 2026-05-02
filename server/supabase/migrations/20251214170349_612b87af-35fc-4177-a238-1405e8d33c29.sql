-- Create role enum
CREATE TYPE public.app_role AS ENUM ('supervisor', 'labour');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  full_name_hindi TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'labour',
  UNIQUE (user_id, role)
);

-- Create labourers table
CREATE TABLE public.labourers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  name TEXT NOT NULL,
  name_hindi TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Helper',
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  location TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create work_entries table
CREATE TABLE public.work_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_type TEXT NOT NULL,
  meters NUMERIC(10,2),
  hours NUMERIC(5,2),
  amount NUMERIC(10,2) NOT NULL,
  location TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged')),
  flag_reason TEXT,
  evidence_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'upi', 'bank')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  work_entry_ids UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create activities table for activity feed
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('work', 'payment', 'labour', 'flag')),
  message TEXT NOT NULL,
  message_hindi TEXT,
  icon TEXT DEFAULT '📋',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labourers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'supervisor'));

-- User roles policies
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- Labourers policies
CREATE POLICY "Supervisors can manage their labourers" ON public.labourers
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor') AND supervisor_id = auth.uid());

CREATE POLICY "Labour can view their own record" ON public.labourers
  FOR SELECT USING (user_id = auth.uid());

-- Work entries policies
CREATE POLICY "Supervisors can manage work entries" ON public.work_entries
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor') AND supervisor_id = auth.uid());

CREATE POLICY "Labour can view their work entries" ON public.work_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.labourers WHERE id = work_entries.labourer_id AND user_id = auth.uid())
  );

-- Payments policies
CREATE POLICY "Supervisors can manage payments" ON public.payments
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor') AND supervisor_id = auth.uid());

CREATE POLICY "Labour can view their payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.labourers WHERE id = payments.labourer_id AND user_id = auth.uid())
  );

-- Activities policies
CREATE POLICY "Supervisors can manage their activities" ON public.activities
  FOR ALL USING (supervisor_id = auth.uid());

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_labourers_updated_at
  BEFORE UPDATE ON public.labourers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_entries_updated_at
  BEFORE UPDATE ON public.work_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup (creates profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();