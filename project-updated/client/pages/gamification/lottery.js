import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { API_BASE_URL } from '../../utils/api'
import { toast } from 'react-toastify'

const Lottery = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [lotteryData, setLotteryData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchLotteryData()
    }
  }, [user])

  useEffect(() => {
    if (lotteryData?.endDate) {
      const timer = setInterval(() => {
        const now = new Date().getTime()
        const endTime = new Date(lotteryData.endDate).getTime()
        const distance = endTime - now

        if (distance > 0) {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24))
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((distance % (1000 * 60)) / 1000)

          setTimeLeft(`${days}д ${hours}ч ${minutes}м ${seconds}с`)
        } else {
          setTimeLeft('Лотерея завершена')
          clearInterval(timer)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [lotteryData])

  const fetchLotteryData = async () => {
    try {
      setIsLoading(true)
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
      const res = await axios.get(`${API_BASE_URL}/api/gamification/lottery`, {
        headers: token ? { 'x-auth-token': token } : {}
      })
      setLotteryData(res.data)
    } catch (error) {
      console.error('Ошибка загрузки данных лотереи:', error)
      toast.error('Ошибка загрузки данных лотереи')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка данных лотереи...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Месячная лотерея</h1>
              <p className="text-gray-600">Участвуйте в розыгрыше ценных призов каждый месяц!</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 sm:mt-0 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              ← Назад к панели
            </button>
          </div>
        </div>

        {/* Lottery Status */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{lotteryData?.prize?.name}</h2>
            <p className="text-gray-600 mb-4">{lotteryData?.prize?.description}</p>
            <div className="text-xl font-semibold text-gray-900">{lotteryData?.prize?.value}</div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">До окончания лотереи</h3>
            <div className="text-4xl font-bold text-gray-900 mb-2">{timeLeft}</div>
            <p className="text-gray-600">
              Розыгрыш состоится {new Date(lotteryData?.endDate).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* User Participation Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ваше участие</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Показатель
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Значение
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Описание
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Ваши билеты
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-2xl font-bold text-gray-900">
                      {lotteryData?.userTickets || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lotteryData?.userTickets > 0 
                      ? `Шанс на выигрыш: ${lotteryData?.userChance}%`
                      : 'Вы не участвуете в лотерее'
                    }
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Всего участников
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-2xl font-bold text-gray-900">
                      {lotteryData?.participants || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Всего билетов: {lotteryData?.totalTickets || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Условия участия</h3>
              <div className="mt-2 text-gray-600">
                <ul className="list-disc list-inside space-y-1">
                  <li>Наберите минимум {lotteryData?.requirements?.minPoints} баллов в текущем месяце</li>
                  <li>За каждые 100 баллов вы получаете 1 лотерейный билет</li>
                  <li>Чем больше билетов, тем выше шанс на выигрыш</li>
                  <li>Победитель определяется случайным образом в конце месяца</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Top Participants */}
        {lotteryData?.topParticipants?.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Лидеры месяца</h3>
              <p className="text-gray-600">Участники с наибольшим количеством билетов</p>
            </div>
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
                      Баллы за месяц
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Билеты
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Шанс
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lotteryData.topParticipants.map((participant, index) => (
                    <tr
                      key={participant._id}
                      className={`hover:bg-gray-50 ${
                        participant._id === user?.id ? 'bg-gray-50 border-l-4 border-gray-900' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg font-semibold text-gray-900">
                            {index === 0 ? '1-е место' : index === 1 ? '2-е место' : index === 2 ? '3-е место' : `${index + 1}-е место`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
                              {participant.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {participant.name}
                              {participant._id === user?.id && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Вы
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {participant.bar || 'Не указано'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {participant.monthlyPoints?.toLocaleString() || 0} баллов
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {participant.tickets || 0} билетов
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lotteryData.totalTickets > 0 
                          ? ((participant.tickets / lotteryData.totalTickets) * 100).toFixed(2)
                          : 0
                        }%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Call to Action */}
        {lotteryData?.userTickets === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Начните участвовать!</h3>
                <div className="mt-2 text-gray-600">
                  <p className="mb-3">
                    Вы еще не участвуете в лотерее этого месяца. 
                    Добавьте продажи и получите лотерейные билеты!
                  </p>
                  <button
                    onClick={() => router.push('/sales/add')}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition duration-200"
                  >
                    Добавить продажу
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Lottery