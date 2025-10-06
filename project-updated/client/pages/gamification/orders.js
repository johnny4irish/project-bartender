import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { authAPI } from '../../utils/api'

const Orders = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      const res = await axios.get('/api/gamification/orders', config)
      // Убеждаемся, что данные - это массив
      setOrders(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error)
      toast.error('Ошибка загрузки заказов')
      // Устанавливаем пустой массив в случае ошибки
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Вы уверены, что хотите отменить этот заказ? Баллы будут возвращены на ваш счет.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      await axios.post(`/api/gamification/orders/${orderId}/cancel`, {}, config)
      toast.success('Заказ отменен, баллы возвращены на ваш счет')
      fetchOrders()
    } catch (error) {
      console.error('Ошибка отмены заказа:', error)
      toast.error(error.response?.data?.message || 'Ошибка отмены заказа')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-purple-100 text-purple-800'
      case 'shipped': return 'bg-indigo-100 text-indigo-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    const statusTexts = {
      'pending': 'Ожидает подтверждения',
      'confirmed': 'Подтвержден',
      'processing': 'В обработке',
      'shipped': 'Отправлен',
      'delivered': 'Доставлен',
      'cancelled': 'Отменен'
    }
    return statusTexts[status] || status
  }

  const canCancelOrder = (order) => {
    return ['pending', 'confirmed'].includes(order.status)
  }

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true
    return order.status === statusFilter
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt)
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt)
      case 'cost-high':
        return b.totalCost - a.totalCost
      case 'cost-low':
        return a.totalCost - b.totalCost
      default:
        return 0
    }
  })

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">История заказов</h1>
              <p className="text-gray-600">Управляйте своими заказами призов</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-4">
              <button
                onClick={() => router.push('/gamification/prizes')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                🎁 К призам
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                ← Главная
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Фильтр по статусу
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
              >
                <option value="all">Все заказы</option>
                <option value="pending">Ожидает подтверждения</option>
                <option value="confirmed">Подтвержден</option>
                <option value="processing">В обработке</option>
                <option value="shipped">Отправлен</option>
                <option value="delivered">Доставлен</option>
                <option value="cancelled">Отменен</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-2">
                Сортировка
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
              >
                <option value="newest">Сначала новые</option>
                <option value="oldest">Сначала старые</option>
                <option value="cost-high">По убыванию стоимости</option>
                <option value="cost-low">По возрастанию стоимости</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка заказов...</p>
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {statusFilter === 'all' ? 'У вас пока нет заказов' : `Нет заказов со статусом "${getStatusText(statusFilter)}"`}
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter === 'all' 
                ? 'Начните делать заказы, чтобы обменять баллы на призы!'
                : 'Попробуйте изменить фильтр или сделать новый заказ'
              }
            </p>
            <button
              onClick={() => router.push('/gamification/prizes')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200"
            >
              Посмотреть призы
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Order Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Заказ #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(order.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {order.totalCost} баллов
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Товары в заказе ({order.items.length})
                  </h4>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.prizeName}</h5>
                          <p className="text-sm text-gray-600">{item.prizeDescription}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">×{item.quantity}</p>
                          <p className="text-sm text-gray-600">{item.priceAtTime * item.quantity} баллов</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                    <div className="text-sm text-gray-600">
                      {order.deliveryAddress && (
                        <p><span className="font-medium">Адрес:</span> {order.deliveryAddress}</p>
                      )}
                      {order.estimatedDelivery && (
                        <p><span className="font-medium">Ожидаемая доставка:</span> {new Date(order.estimatedDelivery).toLocaleDateString('ru-RU')}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/gamification/order-confirmation?orderId=${order._id}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                      >
                        Подробнее
                      </button>
                      {canCancelOrder(order) && (
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!isLoading && sortedOrders.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                <p className="text-sm text-gray-600">Всего заказов</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
                <p className="text-sm text-gray-600">Доставлено</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)).length}
                </p>
                <p className="text-sm text-gray-600">В процессе</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {orders.reduce((sum, order) => sum + order.totalCost, 0)}
                </p>
                <p className="text-sm text-gray-600">Потрачено баллов</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Orders