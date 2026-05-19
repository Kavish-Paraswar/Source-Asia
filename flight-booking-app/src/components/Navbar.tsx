'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plane, Calendar, User, LogOut, Loader2 } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const pathname = usePathname()
  const { user, setUser, reset } = useUserStore()
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)

  // Track auth changes
  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' })
      } else {
        setUser(null)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, supabase.auth])

  const handleDemoLogin = async () => {
    const email = 'demo@skyglide.com'
    const password = 'Password123!'

    try {
      // Try logging in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        // If user doesn't exist, sign them up
        if (error.message.includes('Invalid login credentials')) {
          const { error: signUpError } = await supabase.auth.signUp({ email, password })
          if (signUpError) throw signUpError
          
          // Try logging in again
          const { error: retryError } = await supabase.auth.signInWithPassword({ email, password })
          if (retryError) throw retryError
        } else {
          throw error
        }
      }
    } catch (err) {
      console.error('Login failed:', err)
      alert('Demo login failed. Make sure Supabase is running locally.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    reset()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-dark glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Plane className="h-6 w-6 text-primary rotate-45 transition-transform group-hover:rotate-[90deg]" />
          <span className="text-xl font-bold tracking-tight text-white">
            Sky<span className="text-primary">Glide</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            href="/" 
            className={`text-sm font-medium transition-colors hover:text-white ${pathname === '/' ? 'text-white font-semibold' : 'text-slate-400'}`}
          >
            Home
          </Link>
          <Link 
            href="/my-bookings" 
            className={`text-sm font-medium transition-colors hover:text-white ${pathname === '/my-bookings' ? 'text-white font-semibold' : 'text-slate-400'}`}
          >
            My Bookings
          </Link>
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-4">
          {!mounted ? (
            <div className="h-9 w-24 bg-slate-900/50 border border-border-dark/50 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs text-slate-400">Welcome</span>
                <span className="text-sm font-medium text-white truncate max-w-[150px]">{user.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-950/50 bg-red-950/20 text-red-400 hover:bg-red-900/30 transition-colors text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={handleDemoLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all text-sm font-semibold"
            >
              <User className="h-4 w-4" />
              <span>Demo Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
