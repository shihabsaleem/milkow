-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
    email TEXT,
    name TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Allow individual read" ON public.profiles;
CREATE POLICY "Allow individual read" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow individual update self" ON public.profiles;
CREATE POLICY "Allow individual update self" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admin all" ON public.profiles;
CREATE POLICY "Allow admin all" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create a trigger function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- First user in the database is automatically made 'admin'
  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    INSERT INTO public.profiles (id, role, email, name)
    VALUES (new.id, 'admin', new.email, COALESCE(new.raw_user_meta_data->>'name', 'System Owner'));
  ELSE
    INSERT INTO public.profiles (id, role, email, name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'role', 'driver'), new.email, COALESCE(new.raw_user_meta_data->>'name', 'Driver User'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profile records for existing users
INSERT INTO public.profiles (id, role, email, name)
SELECT id, COALESCE(raw_user_meta_data->>'role', 'driver'), email, COALESCE(raw_user_meta_data->>'name', 'User')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;
