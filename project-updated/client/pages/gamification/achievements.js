import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const Achievements = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [achievements, setAchievements] = useState([])
  const [summary, setSummary] = useState({ unlocked: 0, total: 0, percentage: 0 })
  const [stats, setStats] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchAchievements()
    }
  }, [user])

  const fetchAchievements = async () => {
    try {
      setIsLoading(true)
      const res = await axios.get('/api/gamification/achievements', { withCredentials: true })
      setAchievements(res.data.achievements)
      setSummary(res.data.summary)
      setStats(res.data.stats)
    } catch (error) {
      console.error('Ошибка загрузки достижений:', error)
      toast.error('Ошибка загрузки достижений')
    } finally {
      setIsLoading(false)
    }
  }

  const getProgressBarColor = (unlocked) => {
    return unlocked ? 'bg-green-500' : 'bg-blue-500'
  }

  const getProgressPercentage = (progress, target) => {
    return Math.min((progress / target) * 100, 100)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Достижения</h1>
              <p className="text-gray-600">Отслеживайте свой прогресс и получайте награды за активность!</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 sm:mt-0 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              ← Назад к панели
            </button>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Общий прогресс</h2>
              <p className="text-gray-600">
                Получено {summary.unlocked} из {summary.total} достижений
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900">{summary.percentage}%</div>
              <p className="text-gray-600">завершено</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gray-900 rounded-full h-3 transition-all duration-500"
              style={{ width: `${summary.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего продаж</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSales || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего баллов</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPoints?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Призов получено</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRedemptions || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Дней подряд</p>
                <p className="text-2xl font-bold text-gray-900">{stats.consecutiveDays || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка достижений...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Список достижений</h3>
              <p className="text-gray-600">Ваш прогресс по всем доступным достижениям</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Достижение
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Описание
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Прогресс
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Осталось
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {achievements.map((achievement) => (
                    <tr
                      key={achievement.id}
                      className={`hover:bg-gray-50 ${
                        achievement.unlocked ? 'bg-green-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className={`text-sm font-medium ${
                              achievement.unlocked ? 'text-green-900' : 'text-gray-900'
                            }`}>
                              {achievement.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs">
                          {achievement.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className={`font-medium ${
                                achievement.unlocked ? 'text-green-600' : 'text-gray-900'
                              }`}>
                                {achievement.progress} / {achievement.target}
                              </span>
                              <span className={`text-xs font-medium ${
                                achievement.unlocked ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {Math.round(getProgressPercentage(achievement.progress, achievement.target))}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`rounded-full h-2 transition-all duration-500 ${
                                  getProgressBarColor(achievement.unlocked)
                                }`}
                                style={{ 
                                  width: `${getProgressPercentage(achievement.progress, achievement.target)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {achievement.unlocked ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Получено
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            В процессе
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {!achievement.unlocked && achievement.target - achievement.progress > 0 ? (
                          <span className="font-medium text-gray-600">
                            {achievement.target - achievement.progress}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Motivation Card */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Продолжайте в том же духе!</h3>
              <p className="text-gray-600">
                Каждое достижение приближает вас к новым призам и возможностям.
                Добавляйте больше продаж и поднимайтесь в рейтинге!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Achievements