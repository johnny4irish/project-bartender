import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const GamificationDashboard = ({ leaderboardHtml }) => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({})
  const [recentAchievements, setRecentAchievements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)

  const hasAdminAccess = (u) => {
    if (!u || !u.role) return false
    return u.role === 'admin' || u.role === 'brand_representative'
  }

  const handleLeaderboardClick = (e) => {
    if (hasAdminAccess(user)) {
      e.preventDefault()
      setShowLeaderboardModal(true)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchGamificationData()
    }
  }, [user])

  const fetchGamificationData = async () => {
    try {
      setIsLoading(true)
      const [statsRes, achievementsRes] = await Promise.all([
        axios.get('/api/gamification/stats'),
        axios.get('/api/gamification/achievements')
      ])
      
      setStats(statsRes.data)
      setRecentAchievements(achievementsRes.data.achievements.filter(a => a.unlocked).slice(0, 3))
    } catch (error) {
      console.error('Ошибка загрузки данных геймификации:', error)
      toast.error('Ошибка загрузки данных геймификации')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка данных геймификации...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Геймификация</h1>
          <p className="mt-2 text-gray-600">
            Отслеживайте свои достижения и участвуйте в конкурсах
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">P</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Очки</p>
                <p className="text-2xl font-bold text-gray-900">{user.points || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">A</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Достижения</p>
                <p className="text-2xl font-bold text-gray-900">{stats.achievementsCount || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">R</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Рейтинг</p>
                <p className="text-2xl font-bold text-gray-900">#{stats.rank || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">L</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Уровень</p>
                <p className="text-2xl font-bold text-gray-900">{stats.level || 1}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/gamification/achievements">
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏆</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Достижения</h3>
                <p className="text-gray-600 text-sm">Просмотрите все ваши достижения</p>
              </div>
            </div>
          </Link>

          <Link href="/gamification/leaderboard">
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6" onClick={handleLeaderboardClick}>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Рейтинг</h3>
                <p className="text-gray-600 text-sm">Посмотрите таблицу лидеров</p>
              </div>
            </div>
          </Link>

          <Link href="/gamification/lottery">
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎲</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Лотерея</h3>
                <p className="text-gray-600 text-sm">Участвуйте в розыгрышах призов</p>
              </div>
            </div>
          </Link>

          <Link href="/gamification/prizes">
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎁</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Призы</h3>
                <p className="text-gray-600 text-sm">Обменяйте очки на призы</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Achievements */}
        {recentAchievements.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Последние достижения</h2>
            <div className="space-y-4">
              {recentAchievements.map((achievement, index) => (
                <div key={achievement.id || `achievement-${index}`} className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">{achievement.icon}</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{achievement.name}</h3>
                    <p className="text-gray-600">{achievement.description}</p>
                    <p className="text-sm text-green-600 font-medium">+{achievement.points} очков</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative">
            <button
              onClick={() => setShowLeaderboardModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Закрыть"
            >
              ✕
            </button>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: leaderboardHtml || '' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default GamificationDashboard

export async function getServerSideProps() {
  let leaderboardHtml = ''
  try {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(process.cwd(), '..', '101.txt')
    leaderboardHtml = fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    leaderboardHtml = '<div style="color:red">Не удалось загрузить контент рейтинга (101.txt)</div>'
  }
  return { props: { leaderboardHtml } }
}