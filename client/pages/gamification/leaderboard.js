import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const Leaderboard = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState([])
  const [userRank, setUserRank] = useState(null)
  const [period, setPeriod] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [cityMap, setCityMap] = useState({})
  const [barMap, setBarMap] = useState({})

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchLeaderboard()
    }
  }, [user, period])

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true)
      const res = await axios.get(`/api/gamification/leaderboard?period=${period}&limit=50`)
      setLeaderboard(res.data.leaderboard)
      setUserRank(res.data.userRank)
    } catch (error) {
      console.error('Ошибка загрузки рейтинга:', error)
      toast.error('Ошибка загрузки рейтинга')
    } finally {
      setIsLoading(false)
    }
  }

  // Загружаем справочники городов и заведений, чтобы отображать текстовые значения
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [citiesRes, barsRes] = await Promise.all([
          axios.get('/api/data/cities'),
          axios.get('/api/data/bars')
        ])
        const cities = Array.isArray(citiesRes.data) ? citiesRes.data : []
        const bars = Array.isArray(barsRes.data) ? barsRes.data : []
        const cMap = {}
        const bMap = {}
        cities.forEach(c => { if (c && c._id) cMap[c._id] = c.name || c.displayName || '' })
        bars.forEach(b => { if (b && b._id) bMap[b._id] = b.displayName || b.name || '' })
        setCityMap(cMap)
        setBarMap(bMap)
      } catch (error) {
        console.error('Ошибка загрузки справочников города/заведения:', error?.message || error)
      }
    }
    loadRefs()
  }, [])

  const resolveCity = (city) => {
    try {
      if (!city) return 'Не указан'
      if (typeof city === 'object') {
        return city.name || city.displayName || 'Не указан'
      }
      if (typeof city === 'string') {
        return cityMap[city] || 'Не указан'
      }
      return 'Не указан'
    } catch (_) {
      return 'Не указан'
    }
  }

  const resolveBar = (bar) => {
    try {
      if (!bar) return 'Не указано'
      if (typeof bar === 'object') {
        return bar.displayName || bar.name || 'Не указано'
      }
      if (typeof bar === 'string') {
        return barMap[bar] || 'Не указано'
      }
      return 'Не указано'
    } catch (_) {
      return 'Не указано'
    }
  }

  const getRankText = (rank) => {
    switch (rank) {
      case 1: return '1-е место'
      case 2: return '2-е место'
      case 3: return '3-е место'
      default: return `${rank}-е место`
    }
  }

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '#1'
      case 2: return '#2'
      case 3: return '#3'
      default: return `#${rank}`
    }
  }

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'all': return 'За все время'
      case 'monthly': return 'За месяц'
      case 'weekly': return 'За неделю'
      default: return 'За все время'
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-400"></div>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Таблица лидеров</h1>
              <p className="text-gray-600">Соревнуйтесь с другими барменами и поднимайтесь в рейтинге!</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 sm:mt-0 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              ← Назад к панели
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Период</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'За все время' },
              { value: 'monthly', label: 'За месяц' },
              { value: 'weekly', label: 'За неделю' }
            ].map((periodOption) => (
              <button
                key={periodOption.value}
                onClick={() => setPeriod(periodOption.value)}
                className={`px-4 py-2 rounded-lg transition duration-200 ${
                  period === periodOption.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {periodOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Rank Card */}
        {userRank && user.role === 'bartender' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Ваша позиция</h3>
                <p className="text-gray-600">{getPeriodLabel(period)}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{getRankIcon(userRank)}</div>
                <p className="text-gray-600">из {leaderboard.length}+ участников</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Рейтинг - {getPeriodLabel(period)}
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка рейтинга...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Нет данных для отображения</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Место
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Бармен
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Заведение
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Город
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Баллы
                    </th>
                    {period !== 'all' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Баллы за период
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Заработано
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((participant) => (
                    <tr
                      key={participant._id}
                      className={`hover:bg-gray-50 ${
                        participant._id === user?.id ? 'bg-gray-50 border-l-4 border-gray-900' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {getRankText(participant.rank)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold">
                              {participant.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {participant.name}
                              {participant._id === user?.id && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Вы
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {resolveBar(participant.bar)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {resolveCity(participant.city)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {participant.points?.toLocaleString() || 0} баллов
                          </span>
                        </div>
                      </td>
                      {period !== 'all' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              {participant.periodPoints?.toLocaleString() || 0} баллов
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₽{participant.totalEarnings?.toLocaleString() || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Как подняться в рейтинге?</h3>
              <div className="mt-2 text-gray-600">
                <ul className="list-disc list-inside space-y-1">
                  <li>Добавляйте больше продаж с фотографиями чеков</li>
                  <li>Продавайте товары на большие суммы</li>
                  <li>Участвуйте в акциях и специальных предложениях</li>
                  <li>Поддерживайте активность каждый день</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard