-- 018_expenses_categories_permissions.sql
-- Seed permissions for Expenses Categories module (idempotent)

begin;

-- Insert permissions with compatibility for schemas with/without NOT NULL resource/action columns
do $$
declare
  v_has_resource boolean;
  v_has_action boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'permissions' and column_name = 'resource'
  ) into v_has_resource;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'permissions' and column_name = 'action'
  ) into v_has_action;

  if v_has_resource and v_has_action then
    insert into public.permissions (name, name_ar, resource, action, description, description_ar, category)
    values
      ('expenses_categories.view',   'عرض فئات المصروفات',   'expenses_categories', 'view',   'View expenses categories',      'عرض فئات المصروفات',   'expenses_categories'),
      ('expenses_categories.create', 'إنشاء فئة مصروفات',     'expenses_categories', 'create', 'Create expenses categories',    'إنشاء فئات مصروفات',    'expenses_categories'),
      ('expenses_categories.update', 'تعديل فئات المصروفات',   'expenses_categories', 'update', 'Update expenses categories',    'تعديل فئات المصروفات',   'expenses_categories'),
      ('expenses_categories.delete', 'حذف فئات المصروفات',     'expenses_categories', 'delete', 'Delete expenses categories',    'حذف فئات المصروفات',     'expenses_categories')
    on conflict (name) do nothing;
  elsif v_has_resource and not v_has_action then
    insert into public.permissions (name, name_ar, resource, description, description_ar, category)
    values
      ('expenses_categories.view',   'عرض فئات المصروفات',   'expenses_categories', 'View expenses categories',      'عرض فئات المصروفات',   'expenses_categories'),
      ('expenses_categories.create', 'إنشاء فئة مصروفات',     'expenses_categories', 'Create expenses categories',    'إنشاء فئات مصروفات',    'expenses_categories'),
      ('expenses_categories.update', 'تعديل فئات المصروفات',   'expenses_categories', 'Update expenses categories',    'تعديل فئات المصروفات',   'expenses_categories'),
      ('expenses_categories.delete', 'حذف فئات المصروفات',     'expenses_categories', 'Delete expenses categories',    'حذف فئات المصروفات',     'expenses_categories')
    on conflict (name) do nothing;
  elsif not v_has_resource and v_has_action then
    insert into public.permissions (name, name_ar, action, description, description_ar, category)
    values
      ('expenses_categories.view',   'عرض فئات المصروفات',   'view',   'View expenses categories',      'عرض فئات المصروفات',   'expenses_categories'),
      ('expenses_categories.create', 'إنشاء فئة مصروفات',     'create', 'Create expenses categories',    'إنشاء فئات مصروفات',    'expenses_categories'),
      ('expenses_categories.update', 'تعديل فئات المصروفات',   'update', 'Update expenses categories',    'تعديل فئات المصروفات',   'expenses_categories'),
      ('expenses_categories.delete', 'حذف فئات المصروفات',     'delete', 'Delete expenses categories',    'حذف فئات المصروفات',     'expenses_categories')
    on conflict (name) do nothing;
  else
    insert into public.permissions (name, name_ar, description, description_ar, category)
    values
      ('expenses_categories.view',   'عرض فئات المصروفات',   'View expenses categories',      'عرض فئات المصروفات',   'expenses_categories'),
      ('expenses_categories.create', 'إنشاء فئة مصروفات',     'Create expenses categories',    'إنشاء فئات مصروفات',    'expenses_categories'),
      ('expenses_categories.update', 'تعديل فئات المصروفات',   'Update expenses categories',    'تعديل فئات المصروفات',   'expenses_categories'),
      ('expenses_categories.delete', 'حذف فئات المصروفات',     'Delete expenses categories',    'حذف فئات المصروفات',     'expenses_categories')
    on conflict (name) do nothing;
  end if;
end $$;

-- Grant to a super/admin role if available; handle role_permissions with/without granted_by column
do $$
declare
  v_has_granted_by boolean;
  v_has_roles boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'role_permissions' and column_name = 'granted_by'
  ) into v_has_granted_by;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'roles'
  ) into v_has_roles;

  if v_has_roles then
    if v_has_granted_by then
      insert into public.role_permissions (role_id, permission_id, granted_by)
      select r.id as role_id, p.id as permission_id, (select id from auth.users order by created_at limit 1) as granted_by
      from public.permissions p
      join lateral (
        select id from public.roles
        where lower(name) like any (array['%super%','%admin%'])
        order by case when lower(name) like '%super%' then 0 else 1 end, name asc
        limit 1
      ) r on true
      where p.name in (
        'expenses_categories.view',
        'expenses_categories.create',
        'expenses_categories.update',
        'expenses_categories.delete'
      )
      and not exists (
        select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id
      );
    else
      insert into public.role_permissions (role_id, permission_id)
      select r.id as role_id, p.id as permission_id
      from public.permissions p
      join lateral (
        select id from public.roles
        where lower(name) like any (array['%super%','%admin%'])
        order by case when lower(name) like '%super%' then 0 else 1 end, name asc
        limit 1
      ) r on true
      where p.name in (
        'expenses_categories.view',
        'expenses_categories.create',
        'expenses_categories.update',
        'expenses_categories.delete'
      )
      and not exists (
        select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id
      );
    end if;
  end if;
end $$;

commit;
