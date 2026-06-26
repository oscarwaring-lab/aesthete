import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy (formerly Middleware — renamed in Next.js 16).
 *
 * Runs on every matched request to:
 *  1. Refresh the Supabase auth session and sync cookies, and
 *  2. Optimistically gate `/dashboard/*` behind authentication.
 *
 * Per the Next.js auth guide, this only reads the session from the cookie —
 * no database calls — so it stays fast on prefetched routes.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() revalidates the token and triggers cookie refresh.
  // Do not insert logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect while preserving any refreshed auth cookies that getUser() wrote
  // onto `response`. A bare NextResponse.redirect() would drop them, leaving the
  // browser with a stale/rotated token — the session then fails to persist
  // through the redirect and the user has to retry the sign-in several times.
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url)
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie)
    }
    return redirect
  }

  const path = request.nextUrl.pathname
  const isProtected = path.startsWith('/dashboard')

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return redirectTo(url)
  }

  // Signed-in users shouldn't sit on the auth screens.
  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return redirectTo(url)
  }

  return response
}

export const config = {
  // Run on everything except API routes, static assets and image optimization.
  // API routes are excluded because reconstructing the request here
  // (NextResponse.next({ request })) re-buffers and truncates large request
  // bodies, so request.formData() fails on multi-megabyte multipart uploads in
  // handlers like /api/aesthetic-dna. API routes perform their own auth via
  // supabase.auth.getUser(), so the proxy isn't needed on them.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
