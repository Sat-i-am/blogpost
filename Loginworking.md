# How Sign In Works

---

## Files Involved

```
app/login/page.tsx          ← the UI the user sees and interacts with
lib/supabase/client.ts      ← creates the browser-side Supabase client
lib/supabase/server.ts      ← creates the server-side Supabase client (used by middleware)
lib/supabase/proxy.ts       ← refreshes session on every request
middleware.ts               ← runs on every request before the page loads
app/auth/callback/route.ts  ← handles email confirmation link clicks
```

---

## Sign In Flow (step by step)

```
1. User opens /login
       ↓
   app/login/page.tsx renders the form
   (this is a "use client" component — runs in the browser)

2. User types email + password → clicks "Sign in"
       ↓
   react-hook-form runs zod validation first:
     - email must be a valid email format
     - password must not be empty
   If validation fails → shows inline error messages, never calls onSubmit

3. Validation passes → onSubmit() runs
       ↓
   supabase.auth.signInWithPassword({ email, password })
   (using the browser client from lib/supabase/client.ts)
       ↓
   This sends the credentials to Supabase Auth over HTTPS

4. Supabase Auth checks the credentials:
       ↓
   Case A — Wrong email or password:
     error.message = "Invalid login credentials"
     → onSubmit catches it → sets serverError state
     → red error box appears below the form

   Case B — Email not confirmed yet:
     error.message = "Email not confirmed"
     → same error box appears
     → user needs to click the link in their confirmation email first
    
   Case C — Success:
     Supabase creates two tokens:
       access_token  = short-lived JWT (~1 hour) — proves who the user is
       refresh_token = long-lived token — used to silently get new access_tokens
     @supabase/ssr stores BOTH tokens as HTTP-only cookies in the browser automatically

5. On success → router.push('/')
       ↓
   Browser navigates to the home page
   The session cookies are now attached to every request from this browser

---

## What Happens on Every Subsequent Request (after login)

6. User navigates to any page
       ↓
   middleware.ts runs FIRST (before the page renders)
       ↓
   calls updateSession() from lib/supabase/proxy.ts
       ↓
   proxy.ts creates a server-side Supabase client that can read the cookies
       ↓
   calls supabase.auth.getUser() to check the session:
     - If access_token is still valid → request continues normally
     - If access_token is expired but refresh_token is valid:
         Supabase silently issues a new access_token
         proxy.ts writes the updated cookies back to the response
         request continues normally — user never notices
     - If both tokens are expired or missing → user is treated as logged out

7. Page renders with the user already authenticated
   (Server Components can call createClient() from lib/supabase/server.ts
    to read the user from cookies on the server side)
```

---

## Email Confirmation Flow (signup → first login)

```
1. User signs up on /signup
       ↓
   supabase.auth.signUp() is called
       ↓
   Supabase sends a confirmation email with a link like:
   https://yourdomain.com/auth/callback?code=abc123

2. User clicks the link in their email
       ↓
   Browser opens /auth/callback?code=abc123
       ↓
   app/auth/callback/route.ts runs (this is a Next.js Route Handler)
       ↓
   supabase.auth.exchangeCodeForSession('abc123')
     - The code is one-time use and expires in ~1 hour
     - Supabase verifies it and creates a real session
     - @supabase/ssr sets the session cookies
       ↓
   Route handler redirects to /
   User is now logged in
```

---

## Key Concepts

| Concept | What it means |
|---|---|
| `createBrowserClient` (client.ts) | Used in "use client" components. Runs in the browser. Can set cookies from the browser side. |
| `createServerClient` (server.ts) | Used in Server Components and Route Handlers. Reads cookies from the incoming request. |
| `createServerClient` (proxy.ts) | Used in middleware. Can both read AND write cookies on the request/response. |
| `access_token` | A JWT that expires in ~1 hour. Sent with every request as a cookie. Proves the user is logged in. |
| `refresh_token` | A long-lived token. When access_token expires, proxy.ts uses this to silently get a new one. |
| HTTP-only cookies | The tokens are stored in cookies that JavaScript cannot read — only the browser and server can see them. This prevents XSS attacks from stealing the session. |
| `middleware.ts` | Runs before every page. Without it, sessions are never refreshed and users get randomly logged out. |
| `exchangeCodeForSession` | Converts a one-time email confirmation code into a real session. Only used in /auth/callback. |
