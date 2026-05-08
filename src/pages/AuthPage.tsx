import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

const AuthPage = () => {
  const navigate = useNavigate()
  const { login, register, isAuthenticated } = useAuth()
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields")
      return
    }
    const success = await login(loginEmail, loginPassword)
    if (success) {
      toast.success("Login successful!", {
        description: "Welcome back to DevConnect",
      })
      navigate("/")
    } else {
      toast.error("Login failed", {
        description: "Invalid credentials",
      })
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (registerPassword !== registerConfirmPassword) {
      toast.error("Passwords do not match", {
        description: "Please make sure both password fields match",
      })
      return
    }
    if (!registerName || !registerEmail || !registerPassword) {
      toast.error("Please fill in all fields")
      return
    }
    const success = await register(registerName, registerEmail, registerPassword)
    if (success) {
      toast.success("Account created successfully!", {
        description: "Welcome to DevConnect!",
      })
      navigate("/")
    } else {
      toast.error("Registration failed", {
        description: "Please try again",
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/dev_connect-logo.png" alt="DevConnect" className="w-24 h-24 object-contain" />
          <span className="text-3xl font-bold text-white">DevConnect</span>
        </div>

        <Card className="rounded-xl shadow-lg bg-[#1a1a1a]">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-white">Welcome to DevConnect</CardTitle>
            <CardDescription className="text-sm text-gray-400">
              Connect with peers, share resources, and enjoy coding!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#2a2a2a] p-1">
                <TabsTrigger
                  value="login"
                  className={cn(
                    "rounded-md font-semibold text-sm transition-colors",
                    "data-[state=active]:bg-white data-[state=active]:text-[#141414] data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-gray-400"
                  )}
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className={cn(
                    "rounded-md font-semibold text-sm transition-colors",
                    "data-[state=active]:bg-white data-[state=active]:text-[#141414] data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-gray-400"
                  )}
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-semibold text-white">
                      Email
                    </label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="example@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="bg-[#1a1a1a] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-semibold text-white">
                      Password
                    </label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="bg-[#1a1a1a] text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-gray-600">Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="text-[#036aff] font-semibold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 h-10"
                  >
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="register-name" className="text-sm font-semibold text-white">
                      Full Name
                    </label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Quoc Chau"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      className="bg-[#1a1a1a] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-email" className="text-sm font-semibold text-white">
                      Email
                    </label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="example@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className="bg-[#1a1a1a] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-password" className="text-sm font-semibold text-white">
                      Password
                    </label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a strong password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      className="bg-[#1a1a1a] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-confirm-password" className="text-sm font-semibold text-white">
                      Confirm Password
                    </label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                      className="bg-[#1a1a1a] text-white"
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    By registering, you agree to DevConnect's Terms of Service and Privacy Policy.
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 h-10"
                  >
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          Need help? Contact support at{" "}
          <a href="mailto:devconnect@example.com" className="text-[#036aff] hover:underline">
              devconnect@example.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default AuthPage