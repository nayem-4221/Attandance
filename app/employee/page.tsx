'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera } from 'lucide-react'

interface LocationData {
  latitude: number
  longitude: number
}

interface AttendanceRecord {
  date: string
  checkIn: string | null
  checkOut: string | null
  checkInLocation?: LocationData | null
  checkOutLocation?: LocationData | null
  checkInPhoto?: string | null
  checkOutPhoto?: string | null
}

async function getLocation(): Promise<LocationData | null> {
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
      () => resolve(null),
      { timeout: 10000 }
    )
  })
}

function CameraCapture({ onCapture, label }: { onCapture: (photo: string) => void; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen || !videoRef.current) return

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        })
        videoRef.current!.srcObject = stream
      } catch (error) {
        console.error('Camera access denied:', error)
        alert('Camera access denied. Please allow camera permission.')
      }
    }

    startCamera()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [isOpen])

  const capturePhoto = () => {
    if (!canvasRef.current || !videoRef.current) return
    const context = canvasRef.current.getContext('2d')
    if (!context) return
    context.drawImage(videoRef.current, 0, 0, 640, 480)
    const photoData = canvasRef.current.toDataURL('image/jpeg')
    onCapture(photoData)
    
    if (videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
    setIsOpen(false)
  }

  return (
    <div>
      {!isOpen ? (
        <Button onClick={() => setIsOpen(true)} variant="outline" className="w-full gap-2">
          <Camera size={16} />
          {label}
        </Button>
      ) : (
        <div className="space-y-3">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-black"
            style={{ width: '100%', maxHeight: '400px' }}
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            style={{ display: 'none' }}
          />
          <div className="flex gap-2">
            <Button onClick={capturePhoto} className="flex-1 bg-green-600 hover:bg-green-700">
              Capture Photo
            </Button>
            <Button 
              onClick={() => {
                if (videoRef.current?.srcObject) {
                  const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
                  tracks.forEach(track => track.stop())
                }
                setIsOpen(false)
              }} 
              variant="outline" 
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmployeeDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(false)
  const [showCheckInCamera, setShowCheckInCamera] = useState(false)
  const [showCheckOutCamera, setShowCheckOutCamera] = useState(false)
  const [pendingCheckInPhoto, setPendingCheckInPhoto] = useState<string | null>(null)
  const [pendingCheckOutPhoto, setPendingCheckOutPhoto] = useState<string | null>(null)

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    if (!currentUser || currentUser.type !== 'employee') {
      router.push('/')
      return
    }
    setUser(currentUser)

    const today = new Date().toISOString().split('T')[0]
    const attendanceRecords = JSON.parse(localStorage.getItem(`attendance_${currentUser.id}`) || '[]')
    const today_record = attendanceRecords.find((r: AttendanceRecord) => r.date === today)
    
    if (today_record) {
      setTodayAttendance(today_record)
      setCheckedIn(!!today_record.checkIn)
    }
    setLoading(false)
  }, [router])

  const handleCheckIn = async () => {
    setShowCheckInCamera(true)
  }

  const handleCheckInPhotoCapture = async (photo: string) => {
    setPendingCheckInPhoto(photo)
    setLocationLoading(true)
    const location = await getLocation()
    
    const today = new Date().toISOString().split('T')[0]
    const time = new Date().toLocaleTimeString()
    const attendanceRecords = JSON.parse(localStorage.getItem(`attendance_${user.id}`) || '[]')
    
    let today_record = attendanceRecords.find((r: AttendanceRecord) => r.date === today)
    if (!today_record) {
      today_record = { date: today, checkIn: null, checkOut: null }
      attendanceRecords.push(today_record)
    }
    
    today_record.checkIn = time
    today_record.checkInLocation = location
    today_record.checkInPhoto = photo
    localStorage.setItem(`attendance_${user.id}`, JSON.stringify(attendanceRecords))
    setTodayAttendance(today_record)
    setCheckedIn(true)
    setLocationLoading(false)
    setShowCheckInCamera(false)
    setPendingCheckInPhoto(null)
  }

  const handleCheckOut = async () => {
    setShowCheckOutCamera(true)
  }

  const handleCheckOutPhotoCapture = async (photo: string) => {
    setPendingCheckOutPhoto(photo)
    setLocationLoading(true)
    const location = await getLocation()
    
    const today = new Date().toISOString().split('T')[0]
    const time = new Date().toLocaleTimeString()
    const attendanceRecords = JSON.parse(localStorage.getItem(`attendance_${user.id}`) || '[]')
    
    let today_record = attendanceRecords.find((r: AttendanceRecord) => r.date === today)
    if (today_record) {
      today_record.checkOut = time
      today_record.checkOutLocation = location
      today_record.checkOutPhoto = photo
      localStorage.setItem(`attendance_${user.id}`, JSON.stringify(attendanceRecords))
      setTodayAttendance(today_record)
    }
    setLocationLoading(false)
    setShowCheckOutCamera(false)
    setPendingCheckOutPhoto(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    router.push('/')
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.name}</h1>
            <p className="text-gray-600">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Check In Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {todayAttendance?.checkIn || 'Not checked in'}
                </p>
                {todayAttendance?.checkInLocation && (
                  <p className="text-xs text-gray-500 mt-2">
                    Lat: {todayAttendance.checkInLocation.latitude.toFixed(4)}, 
                    Lng: {todayAttendance.checkInLocation.longitude.toFixed(4)}
                  </p>
                )}
                {todayAttendance?.checkInPhoto && (
                  <div className="mt-2">
                    <img src={todayAttendance.checkInPhoto || "/placeholder.svg"} alt="Check-in proof" className="w-full rounded" />
                  </div>
                )}
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-600 mb-2">Check Out Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {todayAttendance?.checkOut || 'Not checked out'}
                </p>
                {todayAttendance?.checkOutLocation && (
                  <p className="text-xs text-gray-500 mt-2">
                    Lat: {todayAttendance.checkOutLocation.latitude.toFixed(4)}, 
                    Lng: {todayAttendance.checkOutLocation.longitude.toFixed(4)}
                  </p>
                )}
                {todayAttendance?.checkOutPhoto && (
                  <div className="mt-2">
                    <img src={todayAttendance.checkOutPhoto || "/placeholder.svg"} alt="Check-out proof" className="w-full rounded" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!showCheckInCamera && !pendingCheckInPhoto ? (
                <Button
                  onClick={handleCheckIn}
                  disabled={checkedIn || locationLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {locationLoading ? 'Processing...' : checkedIn ? '✓ Checked In' : 'Check In'}
                </Button>
              ) : (
                <div className="col-span-2">
                  {showCheckInCamera && (
                    <CameraCapture 
                      onCapture={handleCheckInPhotoCapture}
                      label="Capture Check-In Photo"
                    />
                  )}
                </div>
              )}
              
              {!showCheckOutCamera && !pendingCheckOutPhoto && checkedIn ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={!checkedIn || !!todayAttendance?.checkOut || locationLoading}
                  variant="outline"
                >
                  {locationLoading ? 'Processing...' : todayAttendance?.checkOut ? '✓ Checked Out' : 'Check Out'}
                </Button>
              ) : showCheckOutCamera ? (
                <div className="col-span-2">
                  <CameraCapture 
                    onCapture={handleCheckOutPhotoCapture}
                    label="Capture Check-Out Photo"
                  />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceHistory employeeId={user?.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AttendanceHistory({ employeeId }: { employeeId: string }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    const attendanceRecords = JSON.parse(localStorage.getItem(`attendance_${employeeId}`) || '[]')
    setRecords(attendanceRecords.reverse())
  }, [employeeId])

  return (
    <div className="space-y-3">
      {records.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No attendance records yet</p>
      ) : (
        records.map((record, idx) => (
          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">{record.date}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>In: {record.checkIn || '-'}</div>
              <div>Out: {record.checkOut || '-'}</div>
            </div>
            {record.checkInPhoto && (
              <div className="mt-2">
                <p className="text-xs font-medium mb-1">Check-in Proof:</p>
                <img src={record.checkInPhoto || "/placeholder.svg"} alt="Check-in" className="w-20 h-20 rounded object-cover" />
              </div>
            )}
            {record.checkOutPhoto && (
              <div className="mt-2">
                <p className="text-xs font-medium mb-1">Check-out Proof:</p>
                <img src={record.checkOutPhoto || "/placeholder.svg"} alt="Check-out" className="w-20 h-20 rounded object-cover" />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
