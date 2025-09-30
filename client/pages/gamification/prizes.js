import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const Prizes = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [prizes, setPrizes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const [addingToCart, setAddingToCart] = useState(null)
  const [cart, setCart] = useState({ items: [], totalCost: 0 })
  const [showCart, setShowCart] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchPrizes()
      fetchCart()
    }
  }, [user, selectedCategory, showAvailableOnly])

  const fetchPrizes = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory) params.append('category', selectedCategory)
      if (showAvailableOnly) params.append('available', 'true')

      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      const res = await axios.get(`/api/gamification/prizes?${params.toString()}`, config)
      setPrizes(res.data)
    } catch (error) {
      console.error('Ошибка загрузки призов:', error)
      toast.error('Ошибка загрузки призов')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      const res = await axios.get('/api/gamification/cart', config)
      setCart(res.data)
    } catch (error) {
      console.error('Ошибка загрузки корзины:', error)
    }
  }

  const handleAddToCart = async (prizeId) => {
    try {
      setAddingToCart(prizeId)
      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      const res = await axios.post(`/api/gamification/cart/add/${prizeId}`, { quantity: 1 }, config)
      
      toast.success('Приз добавлен в корзину!')
      fetchCart()
      
    } catch (error) {
      console.error('Ошибка добавления в корзину:', error)
      toast.error(error.response?.data?.msg || 'Ошибка добавления в корзину')
    } finally {
      setAddingToCart(null)
    }
  }

  const handleUpdateQuantity = async (prizeId, newQuantity) => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      if (newQuantity === 0) {
        await axios.delete(`/api/gamification/cart/remove/${prizeId}`, config)
      } else {
        await axios.put(`/api/gamification/cart/update/${prizeId}`, { quantity: newQuantity }, config)
      }
      
      fetchCart()
    } catch (error) {
      console.error('Ошибка обновления корзины:', error)
      toast.error('Ошибка обновления корзины')
    }
  }

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true)
      const token = localStorage.getItem('token')
      const config = {
        headers: {
          'x-auth-token': token
        }
      }

      const res = await axios.post('/api/gamification/cart/checkout', {}, config)
      
      toast.success('Заказ успешно оформлен!')
      setCart({ items: [], totalCost: 0 })
      setShowCart(false)
      
      // Перенаправить на страницу подтверждения заказа
      router.push(`/gamification/order-confirmation?orderId=${res.data.order._id}`)
      
    } catch (error) {
      console.error('Ошибка оформления заказа:', error)
      toast.error(error.response?.data?.msg || 'Ошибка оформления заказа')
    } finally {
      setIsCheckingOut(false)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'merchandise': return '🎁'
      case 'discount': return '💰'
      case 'experience': return '🎯'
      case 'cash': return '💵'
      case 'other': return '⭐'
      default: return '🎁'
    }
  }

  const getCategoryName = (category) => {
    const categoryNames = {
      'merchandise': 'Товары',
      'discount': 'Скидки', 
      'experience': 'Впечатления',
      'cash': 'Денежные призы',
      'other': 'Другое'
    }
    return categoryNames[category] || category
  }

  const categories = ['merchandise', 'discount', 'experience', 'cash', 'other']

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Магазин призов</h1>
              <p className="text-gray-600">Добавляйте призы в корзину и оформляйте заказы!</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <div className="bg-gray-900 text-white px-4 py-2 rounded-lg">
                <span className="font-semibold">{user.points?.toLocaleString() || 0} баллов</span>
              </div>
              {cart.items.length > 0 && (
                <button
                  onClick={() => setShowCart(!showCart)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 relative"
                >
                  🛒 Корзина ({cart.items.length})
                  {cart.totalCost > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {cart.totalCost}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => router.push('/gamification/cart')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 relative"
              >
                🛒 Корзина
                {cart.items.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.items.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/gamification/orders')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                📋 Мои заказы
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                ← Назад к панели
              </button>
            </div>
          </div>
        </div>

        {/* Cart Panel */}
        {showCart && cart.items.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Корзина</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.prize._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.prize.name}</h3>
                    <p className="text-sm text-gray-600">{item.priceAtTime} баллов за штуку</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleUpdateQuantity(item.prize._id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-medium">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.prize._id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleUpdateQuantity(item.prize._id, 0)}
                      className="text-red-600 hover:text-red-800 ml-2"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Итого: {cart.totalCost} баллов</span>
                <span className="text-sm text-gray-600">
                  Останется: {user.points - cart.totalCost} баллов
                </span>
              </div>
              
              {user.points >= cart.totalCost ? (
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition duration-200 disabled:opacity-50"
                >
                  {isCheckingOut ? 'Оформляем заказ...' : 'Оформить заказ'}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-red-600 mb-2">
                    Недостаточно баллов! Нужно еще {cart.totalCost - user.points} баллов
                  </p>
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-medium cursor-not-allowed"
                  >
                    Недостаточно баллов
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Категории</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-4 py-2 rounded-lg transition duration-200 ${
                    selectedCategory === ''
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Все категории
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg transition duration-200 ${
                      selectedCategory === category
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getCategoryName(category)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showAvailableOnly}
                  onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 shadow-sm focus:border-gray-300 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Только доступные</span>
              </label>
            </div>
          </div>
        </div>

        {/* Prizes Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка призов...</p>
          </div>
        ) : prizes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Призы не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить фильтры или вернитесь позже</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Приз
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Стоимость
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Количество
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действие
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {prizes.map((prize) => (
                    <tr key={prize._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{prize.name}</div>
                        <div className="text-sm text-gray-500">{prize.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {getCategoryName(prize.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prize.cost?.toLocaleString() || 0} баллов
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prize.quantity > 0 ? prize.quantity : 'Закончился'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!prize.isAvailable ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Недоступен
                          </span>
                        ) : !prize.canAfford ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Недостаточно баллов
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-900 text-white">
                            Доступен
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         <button
                           onClick={() => handleAddToCart(prize._id)}
                           disabled={
                             !prize.canAfford || 
                             !prize.isAvailable || 
                             addingToCart === prize._id
                           }
                           className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                             !prize.canAfford || !prize.isAvailable
                               ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                               : addingToCart === prize._id
                               ? 'bg-gray-400 text-white cursor-not-allowed'
                               : 'bg-blue-600 hover:bg-blue-700 text-white'
                           }`}
                         >
                           {addingToCart === prize._id ? (
                             <div className="flex items-center">
                               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                               Добавляем...
                             </div>
                           ) : !prize.canAfford ? (
                             `Нужно еще ${(prize.cost - user.points).toLocaleString()}`
                           ) : !prize.isAvailable ? (
                             'Недоступен'
                           ) : (
                             '🛒 В корзину'
                           )}
                         </button>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Как получить больше баллов?</h3>
              <div className="mt-2 text-gray-600">
                <ul className="list-disc list-inside space-y-1">
                  <li>Добавляйте продажи с фотографиями чеков - получайте 10% от суммы в баллах</li>
                  <li>Участвуйте в специальных акциях с повышенными коэффициентами</li>
                  <li>Выполняйте ежедневные задания и достижения</li>
                  <li>Приглашайте других барменов и получайте бонусы</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Prizes