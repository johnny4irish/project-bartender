import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const OrderConfirmation = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { orderId } = router.query
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (orderId && user) {
      fetchOrder()
    }
  }, [orderId, user])

  const fetchOrder = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      const res = await axios.get(`/api/gamification/orders/${orderId}`, config)
      setOrder(res.data)
      setDeliveryAddress(res.data.deliveryAddress || '')
      setNotes(res.data.notes || '')
    } catch (error) {
      console.error('Ошибка загрузки заказа:', error)
      toast.error('Ошибка загрузки заказа')
      router.push('/gamification/prizes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateDelivery = async () => {
    try {
      setIsUpdating(true)
      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      await axios.put(`/api/gamification/orders/${orderId}`, {
        deliveryAddress,
        notes
      }, config)

      toast.success('Информация о доставке обновлена!')
      fetchOrder()
    } catch (error) {
      console.error('Ошибка обновления заказа:', error)
      toast.error('Ошибка обновления заказа')
    } finally {
      setIsUpdating(false)
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
            <p className="mt-4 text-gray-600">Загрузка заказа...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Заказ не найден</h3>
            <p className="text-gray-600 mb-4">Возможно, заказ был удален или у вас нет доступа к нему</p>
            <button
              onClick={() => router.push('/gamification/prizes')}
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Вернуться к призам
            </button>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Подтверждение заказа</h1>
              <p className="text-gray-600">Заказ #{order.orderNumber}</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
              <button
                onClick={() => router.push('/gamification/orders')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                📋 Все заказы
              </button>
              <button
                onClick={() => router.push('/gamification/prizes')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                ← К призам
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">✓</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-900">Заказ успешно оформлен!</h3>
              <p className="text-green-700 mt-1">
                Ваш заказ принят в обработку. Мы свяжемся с вами для уточнения деталей доставки.
              </p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Детали заказа</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Информация о заказе</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Номер заказа:</span> {order.orderNumber}</p>
                <p><span className="font-medium">Дата заказа:</span> {new Date(order.createdAt).toLocaleDateString('ru-RU')}</p>
                <p><span className="font-medium">Общая стоимость:</span> {order.totalCost} баллов</p>
                <p><span className="font-medium">Способ оплаты:</span> Баллы</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Доставка</h3>
              <div className="space-y-2">
                {order.estimatedDelivery && (
                  <p><span className="font-medium">Ожидаемая доставка:</span> {new Date(order.estimatedDelivery).toLocaleDateString('ru-RU')}</p>
                )}
                {order.actualDelivery && (
                  <p><span className="font-medium">Фактическая доставка:</span> {new Date(order.actualDelivery).toLocaleDateString('ru-RU')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Товары в заказе</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.prizeName}</h4>
                    <p className="text-sm text-gray-600">{item.prizeDescription}</p>
                    <p className="text-sm text-gray-500">Цена на момент заказа: {item.priceAtTime} баллов</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Количество: {item.quantity}</p>
                    <p className="text-sm text-gray-600">Итого: {item.priceAtTime * item.quantity} баллов</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Информация о доставке</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Адрес доставки
              </label>
              <textarea
                id="deliveryAddress"
                rows={3}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                placeholder="Укажите полный адрес доставки..."
              />
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Комментарии к заказу
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                placeholder="Дополнительные пожелания или комментарии..."
              />
            </div>
            
            <button
              onClick={handleUpdateDelivery}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200 disabled:opacity-50"
            >
              {isUpdating ? 'Сохраняем...' : 'Сохранить информацию'}
            </button>
          </div>
        </div>

        {/* Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">История статусов</h2>
            <div className="space-y-4">
              {order.statusHistory.map((history, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(history.status).replace('text-', 'bg-').replace('100', '500')}`}></div>
                  <div className="flex-1">
                    <p className="font-medium">{getStatusText(history.status)}</p>
                    <p className="text-sm text-gray-600">{new Date(history.timestamp).toLocaleString('ru-RU')}</p>
                    {history.comment && (
                      <p className="text-sm text-gray-500 mt-1">{history.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderConfirmation