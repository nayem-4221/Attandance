'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'

interface Employee {
  id: string
  email: string
  name: string
}

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

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    if (!currentUser || currentUser.type !== 'admin') {
      router.push('/')
      return
    }
    setUser(currentUser)

    // Fetch users and attendance from API
    fetch('https://script.google.com/macros/s/AKfycbxQ5M4d_n3g37osQj8LDrnCkwQ_ZiGylgCqEfI61nnAu47uONTC7o_1UXLIPcimvLgF/exec')
      .then(res => res.json())
      .then(data => {
        // Expecting data.users and data.attendance
        if (data.users && Array.isArray(data.users)) {
          setEmployees(data.users)
          if (data.users.length > 0) {
            setSelectedEmployee(data.users[0])
          }
        }
        if (data.attendance && Array.isArray(data.attendance)) {
          setAttendanceData(data.attendance)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    router.push('/')
  }

  const handleDeleteEmployee = (empId: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      const updatedEmployees = employees.filter((emp) => emp.id !== empId)
      setEmployees(updatedEmployees)
      localStorage.setItem('employees', JSON.stringify(updatedEmployees))
      localStorage.removeItem(`attendance_${empId}`)
      
      if (selectedEmployee?.id === empId) {
        setSelectedEmployee(updatedEmployees.length > 0 ? updatedEmployees[0] : null)
      }
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  // Helper to calculate duty duration
  function getDutyDuration(inTime, outTime) {
    if (!inTime || !outTime) return '-';
    try {
      const inDate = new Date(`1970-01-01T${inTime}`);
      const outDate = new Date(`1970-01-01T${outTime}`);
      let diffMs = outDate - inDate;
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // handle overnight
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs / (1000 * 60)) % 60);
      return `${hours}h ${mins}m`;
    } catch {
      return '-';
    }
  }

  // Merge attendance with user info
  const allAttendance = attendanceData.map((rec) => {
    const emp = employees.find(e => e.id === rec.employeeId);
    return {
      employeeName: emp ? emp.name : rec.employeeId,
      employeeEmail: emp ? emp.email : '',
      ...rec
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600">Attendance Management System</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* New: All Attendance Table */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">All Users Attendance</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {allAttendance.length === 0 ? (
              <p className="text-gray-500 text-sm">No attendance records found</p>
            ) : (
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Email</th>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Check In</th>
                    <th className="p-2 border">Check Out</th>
                    <th className="p-2 border">Duty Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {allAttendance.map((rec, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 border">{rec.employeeName}</td>
                      <td className="p-2 border">{rec.employeeEmail}</td>
                      <td className="p-2 border">{rec.date}</td>
                      <td className="p-2 border">{rec.checkIn || '-'}</td>
                      <td className="p-2 border">{rec.checkOut || '-'}</td>
                      <td className="p-2 border">{getDutyDuration(rec.checkIn, rec.checkOut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Team Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {employees.length === 0 ? (
                <p className="text-gray-500 text-sm">No employees yet</p>
              ) : (
                employees.map((emp) => (
                  <div
                    key={emp.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedEmployee?.id === emp.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-xs opacity-75">{emp.email}</p>
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="ml-2 p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
                      title="Delete employee"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            {selectedEmployee ? (
              <EmployeeAttendanceDetails employee={selectedEmployee} />
            ) : (
              <Card className="shadow-lg">
                <CardContent className="p-6 text-center text-gray-500">
                  No employee selected
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmployeeAttendanceDetails({ employee }: { employee: Employee }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)

  useEffect(() => {
    const attendanceRecords = JSON.parse(localStorage.getItem(`attendance_${employee.id}`) || '[]')
    console.log("[v0] Loading attendance for", employee.id, "Records:", attendanceRecords)
    setRecords(attendanceRecords.reverse())
  }, [employee.id])

  const getTodayStatus = () => {
    const today = new Date().toISOString().split('T')[0]
    return records.find((r) => r.date === today)
  }

  const todayStatus = getTodayStatus()

  const openLocationInMap = (location: LocationData | null | undefined) => {
    if (!location) return
    window.open(
      `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
      '_blank'
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{employee.name}</CardTitle>
        <p className="text-sm text-gray-600">{employee.email}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3 text-gray-700">Today's Status</h3>
          {todayStatus ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Check In</p>
                <p className="text-lg font-bold text-green-600">{todayStatus.checkIn}</p>
                {todayStatus.checkInLocation && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">
                      Lat: {todayStatus.checkInLocation.latitude.toFixed(4)}, 
                      Lng: {todayStatus.checkInLocation.longitude.toFixed(4)}
                    </p>
                    <button
                      onClick={() => openLocationInMap(todayStatus.checkInLocation)}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                    >
                      View on Map
                    </button>
                  </div>
                )}
                {todayStatus.checkInPhoto && (
                  <div className="mt-2">
                    <img src={todayStatus.checkInPhoto || "/placeholder.svg"} alt="Check-in proof" className="w-full rounded" />
                  </div>
                )}
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-gray-600">Check Out</p>
                <p className="text-lg font-bold text-orange-600">{todayStatus.checkOut || 'Pending'}</p>
                {todayStatus.checkOutLocation && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">
                      Lat: {todayStatus.checkOutLocation.latitude.toFixed(4)}, 
                      Lng: {todayStatus.checkOutLocation.longitude.toFixed(4)}
                    </p>
                    <button
                      onClick={() => openLocationInMap(todayStatus.checkOutLocation)}
                      className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700"
                    >
                      View on Map
                    </button>
                  </div>
                )}
                {todayStatus.checkOutPhoto && (
                  <div className="mt-2">
                    <img src={todayStatus.checkOutPhoto || "/placeholder.svg"} alt="Check-out proof" className="w-full rounded" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No attendance marked today</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-gray-700">Attendance History</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {records.length === 0 ? (
              <p className="text-gray-500 text-sm">No attendance records</p>
            ) : (
              records.map((record, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setExpandedRecord(expandedRecord === record.date ? null : record.date)}
                    className="w-full text-left"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{record.date}</span>
                      <span className="text-xs text-gray-500">
                        {expandedRecord === record.date ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>
                  {expandedRecord === record.date && (
                    <div className="mt-2 text-sm text-gray-600 space-y-2">
                      <div>In: {record.checkIn || '-'}</div>
                      {record.checkInLocation && (
                        <div className="text-xs text-gray-500 ml-4">
                          Lat: {record.checkInLocation.latitude.toFixed(4)}, Lng: {record.checkInLocation.longitude.toFixed(4)}
                        </div>
                      )}
                      {record.checkInPhoto && (
                        <div className="mt-2">
                          <img src={record.checkInPhoto || "/placeholder.svg"} alt="Check-in" className="w-32 rounded" />
                        </div>
                      )}
                      <div className="mt-2">Out: {record.checkOut || '-'}</div>
                      {record.checkOutLocation && (
                        <div className="text-xs text-gray-500 ml-4 mt-1">
                          Lat: {record.checkOutLocation.latitude.toFixed(4)}, Lng: {record.checkOutLocation.longitude.toFixed(4)}
                        </div>
                      )}
                      {record.checkOutPhoto && (
                        <div className="mt-2">
                          <img src={record.checkOutPhoto || "/placeholder.svg"} alt="Check-out" className="w-32 rounded" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-gray-700">Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">Total Days</p>
              <p className="text-2xl font-bold text-blue-600">{records.length}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600">Checked In</p>
              <p className="text-2xl font-bold text-purple-600">{records.filter((r) => r.checkIn).length}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
