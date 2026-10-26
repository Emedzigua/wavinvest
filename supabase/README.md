# Database (Supabase)

Project: **WAV Invest** (`gxtxyambdmzbjrlunsju`, region eu-central-1 / Frankfurt).

`migrations/` holds the schema that is applied to that project. To set up a fresh
database, run the files in order in the Supabase SQL editor.

## Admin accounts

There is no sign-up page. To add the second admin:

1. Supabase dashboard → Authentication → Users → **Add user** → *Create new user*
   (enter the email and a password, tick *Auto confirm user*).
2. SQL editor:

   ```sql
   insert into public.admins (user_id, name)
   select id, 'Meno Priezvisko' from auth.users where email = 'email@firma.sk';
   ```

Only users listed in `public.admins` can see or change anything, even if someone
manages to create an account.

## Quote form secret

The website calls `submit_quote` with `QUOTE_FORM_SECRET`; the database only stores its SHA-256, so
the function can't be called directly with the public key. To change the secret:

```sql
update private.app_secrets
set sha256 = encode(extensions.digest('<new secret>', 'sha256'), 'hex')
where name = 'quote_form';
```

and set the same value as `QUOTE_FORM_SECRET` in Vercel.
