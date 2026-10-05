-- The card pool changed to Card Wars heroes: new profiles default to Finn.
alter table public.profiles alter column avatar set default 'finn';
update public.profiles set avatar = 'finn' where avatar = 'sola';
