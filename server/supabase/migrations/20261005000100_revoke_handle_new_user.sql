-- The profile trigger function must not be callable through the API (security advisor 0028/0029).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
