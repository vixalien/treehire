import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/toaster"
import { AuthProvider } from "@/components/auth/auth-provider"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserMenu } from "@/components/user-menu"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Treehire - AI Interview Assistant",
  description: "AI-powered interview management and analysis platform",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ProtectedRoute>
            <nav className="border-b bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                  <div className="flex items-center">
                    <Link href="/" className="text-xl font-bold text-green-700">
                      🌳 Treehire
                    </Link>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Link href="/interviews">
                      <Button variant="ghost">Dashboard</Button>
                    </Link>
                    <Link href="/">
                      <Button variant="ghost">New Interview</Button>
                    </Link>
                    <UserMenu />
                  </div>
                </div>
              </div>
            </nav>
            {children}
          </ProtectedRoute>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
