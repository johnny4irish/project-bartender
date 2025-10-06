import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import { API_BASE_URL } from '../../utils/api'
import { toast } from 'react-toastify'

const SalesHistory = () => {
  const [sales, setSales] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [brandMap, setBrandMap] = useState({})

  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchSales()
    fetchStats()
    fetchBrands()
  }, [isAuthenticated, currentPage])

  const fetchSales = async () => {
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      }

      const res = await axios.get(`${API_BASE_URL}/api/sales?page=${currentPage}&limit=10`, config)
      setSales(res.data.sales)
      setPagination(res.data.pagination)
    } catch (error) {
      console.error(error)
      toast.error('Ошибка при загрузке продаж')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      }

      const res = await axios.get(`${API_BASE_URL}/api/sales/stats`, config)
      setStats(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchBrands = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/data/brands`)
      const brands = res.data || []
      const map = {}
      brands.forEach(b => {
        if (b && (b._id || b.id)) {
          map[b._id || b.id] = b.displayName || b.name || 'Без имени'
        }
      })
      setBrandMap(map)
    } catch (error) {
      console.error('Ошибка при загрузке брендов', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Одобрено'
      case 'rejected':
        return 'Отклонено'
      case 'pending':
        return 'На проверке'
      default:
        return 'Неизвестно'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const resolveBrandName = (brand) => {
    if (!brand) return '—'
    if (typeof brand === 'string') {
      return brandMap[brand] || brand
    }
    if (typeof brand === 'object') {
      return brand.displayName || brand.name || brand._id || '—'
    }
    return String(brand)
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">
                ← Назад
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">История продаж</h1>
            </div>
            <Link
              href="/sales/add"
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Добавить продажу
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {stats && (
          <div className="px-4 py-6 sm:px-0">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Статистика продаж</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-gray-600 whitespace-normal break-words">Всего продаж</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-gray-600 whitespace-normal break-words">Одобренные</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.approvedSales}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-gray-600 whitespace-normal break-words">На проверке</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingSales}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-gray-600 whitespace-normal break-words">Общая сумма</p>
                    <p className="text-2xl font-bold text-gray-900">₽{stats.totalAmount?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-gray-600 whitespace-normal break-words">Заработано баллов</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPoints?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Table */}
        <div className="px-4 sm:px-0">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Список продаж
              </h3>
              
              {sales.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <p className="text-xl">Нет продаж</p>
                  </div>
                  <p className="text-gray-500 mb-6">
                    У вас пока нет зарегистрированных продаж
                  </p>
                  <Link
                    href="/sales/add"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
                  >
                    Добавить первую продажу
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Товар
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Количество
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Сумма
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Баллы
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Статус
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Дата
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sales.map((sale) => (
                        <tr key={sale._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {sale.product} - {resolveBrandName(sale.brand)}
                            </div>
                            {sale.description && (
                              <div className="text-sm text-gray-500">
                                {sale.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {sale.price?.toLocaleString() || 0} ₽
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {sale.pointsEarned || 0} баллов
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.verificationStatus)}`}>
                              {getStatusText(sale.verificationStatus)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(sale.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-gray-600 hover:text-gray-900 mr-4">
                              Просмотр
                            </button>
                            {sale.verificationStatus === 'pending' && (
                              <button className="text-red-600 hover:text-red-900">
                                Удалить
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Предыдущая
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                disabled={currentPage === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Следующая
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Показано <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> до{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, pagination.total)}
                  </span>{' '}
                  из <span className="font-medium">{pagination.total}</span> результатов
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Предыдущая
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                    disabled={currentPage === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Следующая
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SalesHistory