'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

async function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        resolve(null)
      },
      { timeout: 10000 }
    )
  })
}

async function fetchUsersFromAPI() {
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbxQ5M4d_n3g37osQj8LDrnCkwQ_ZiGylgCqEfI61nnAu47uONTC7o_1UXLIPcimvLgF/exec')
    const data = await response.json()
    console.log('[v0] API response received with users:', data.length)
    return data
  } catch (error) {
    console.log('[v0] API fetch error:', error)
    return null
  }
}

export default function Home() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [apiLoading, setApiLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    if (currentUser) {
      if (currentUser.type === 'admin') {
        router.push('/admin')
      } else {
        router.push('/employee')
      }
    } else {
      // Fetch users from API
      fetchUsersFromAPI().then((data) => {
        if (data) {
          console.log('[v0] Loaded users from API')
          setUsers(data)
        }
        setApiLoading(false)
      })
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLocationLoading(true)

    if (!id || !password) {
      setError('ID and password required')
      setLocationLoading(false)
      return
    }

    const user = users.find((u: any) => u.username === id && u.password === password)

    if (!user) {
      setError('Invalid ID or password')
      setLocationLoading(false)
      return
    }

    const location = await getLocation()

    const isAdmin = user.username === 'Nayem'
    const userType = isAdmin ? 'admin' : 'employee'

    // Log login with location
    const loginLog = JSON.parse(localStorage.getItem('loginLogs') || '[]')
    loginLog.push({
      employeeId: user.id,
      name: user.username,
      timestamp: new Date().toISOString(),
      location: location,
      type: 'login'
    })
    localStorage.setItem('loginLogs', JSON.stringify(loginLog))

    localStorage.setItem('currentUser', JSON.stringify({ 
      id: user.id,
      username: user.username,
      type: userType,
      location 
    }))

    setLocationLoading(false)
    
    if (isAdmin) {
      router.push('/admin')
    } else {
      router.push('/employee')
    }
  }

  if (apiLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading user data from API...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Attendance Tracker</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">Team attendance management system</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                type="text"
                placeholder="Enter your username"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {locationLoading && <p className="text-blue-500 text-sm">Accessing location...</p>}
            <Button type="submit" className="w-full" disabled={locationLoading}>
              {locationLoading ? 'Processing...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
