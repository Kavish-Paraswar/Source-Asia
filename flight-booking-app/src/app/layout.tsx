import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import ToastContainer from "@/components/ToastContainer"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "SkyGlide Airlines | Premium Flight Booking",
  description: "Experience premium flight management, seat selection, and booking with real-time updates.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SkyGlide Airlines",
  },
}

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-background-dark text-slate-100">
        <Navbar />
        <main className="flex-1 flex flex-col relative z-10">
          {children}
        </main>
        <ToastContainer />
      </body>
    </html>
  )
}
