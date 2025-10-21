-- 修复 profiles 表的 RLS 策略
-- 添加 INSERT 策略，允许用户创建自己的 profile

-- 添加 INSERT 策略
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 为所有现有的认证用户创建 profiles 记录
INSERT INTO public.profiles (id, email, name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
