'use client'

import { useToastStore } from '@/store/useToastStore'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-slate-900 border-slate-800 text-slate-100'
          let Icon = Info
          let iconColor = 'text-sky-400'

          if (toast.type === 'success') {
            bgColor = 'bg-slate-900/90 border-emerald-950/50 text-slate-100'
            Icon = CheckCircle
            iconColor = 'text-emerald-400'
          } else if (toast.type === 'error') {
            bgColor = 'bg-slate-900/90 border-red-950/50 text-slate-100'
            Icon = AlertTriangle
            iconColor = 'text-red-400'
          }

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className={`flex items-start gap-3 p-4 rounded-xl border glass shadow-2xl pointer-events-auto ${bgColor}`}
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-sm font-medium pr-2">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
