import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { authAPI, API_BASE_URL } from '../../utils/api';

export default function Cart() {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }

        // Проверяем аутентификацию
        const userData = await authAPI.me()
        setUser(userData)
        
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error)
        localStorage.removeItem('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { 'x-auth-token': token }
      }
      
      const res = await axios.get(`${API_BASE_URL}/api/auth/user`, config)
      setUser(res.data)
      // Обновляем данные в localStorage
      localStorage.setItem('user', JSON.stringify(res.data))
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error)
      // Если не удалось загрузить, используем данные из localStorage
      const userData = JSON.parse(localStorage.getItem('user'))
      setUser(userData)
    }
  }

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { 'x-auth-token': token }
      }
      
      const res = await axios.get(`${API_BASE_URL}/api/gamification/cart`, config)
      setCart(res.data)
    } catch (error) {
      console.error('Ошибка загрузки корзины:', error)
      // Если корзина не найдена, создаем пустую
      if (error.response?.status === 404) {
        setCart({ items: [], totalCost: 0 })
      }
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (prizeId, newQuantity) => {
    if (newQuantity < 1) return

    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { 'x-auth-token': token }
      }

      await axios.put(`${API_BASE_URL}/api/gamification/cart`, {
        prizeId,
        quantity: newQuantity
      }, config)

      fetchCart() // Обновляем корзину
    } catch (error) {
      console.error('Ошибка обновления количества:', error)
      alert('Ошибка при обновлении количества')
    }
  }

  const removeFromCart = async (prizeId) => {
    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { 'x-auth-token': token }
      }

      await axios.delete(`${API_BASE_URL}/api/gamification/cart/${prizeId}`, config)
      fetchCart() // Обновляем корзину
    } catch (error) {
      console.error('Ошибка удаления из корзины:', error)
      alert('Ошибка при удалении из корзины')
    }
  }

  const proceedToCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      alert('Корзина пуста')
      return
    }

    if (user.points < cart.totalCost) {
      alert('Недостаточно баллов для оформления заказа')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const config = {
        headers: { 'x-auth-token': token }
      }

      const res = await axios.post(`${API_BASE_URL}/api/gamification/cart/checkout`, {
        deliveryAddress: 'Не указан', // Можно будет изменить на странице подтверждения
        notes: ''
      }, config)

      // Перенаправляем на страницу подтверждения заказа
      router.push(`/gamification/order-confirmation?orderId=${res.data.order.orderNumber}`)
    } catch (error) {
      console.error('Ошибка создания заказа:', error)
      alert('Ошибка при создании заказа')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка корзины...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Заголовок */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Корзина</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/gamification/prizes')}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Продолжить покупки
              </button>
              <button
                onClick={() => router.push('/gamification/orders')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Мои заказы
              </button>
            </div>
          </div>
          
          {user && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Ваши баллы:</span> {user.points}
              </p>
            </div>
          )}
        </div>

        {/* Содержимое корзины */}
        {!cart || cart.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15.5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Корзина пуста</h3>
            <p className="text-gray-600 mb-6">Добавьте призы из каталога, чтобы начать покупки</p>
            <button
              onClick={() => router.push('/gamification/prizes')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Перейти к призам
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Товары в корзине */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Товары в корзине ({cart.items.length})
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {cart.items.map((item) => (
                  <div key={item.prize._id} className="p-6 flex items-center space-x-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{item.prize.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.prize.description}</p>
                      <p className="text-sm font-medium text-blue-600 mt-2">
                        {item.prize.cost} баллов за штуку
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateQuantity(item.prize._id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.prize._id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-medium text-gray-900">
                        {item.prize.cost * item.quantity} баллов
                      </p>
                      <button
                        onClick={() => removeFromCart(item.prize._id)}
                        className="text-sm text-red-600 hover:text-red-800 mt-1"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Итого и оформление заказа */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Итого к оплате</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{cart.totalCost} баллов</p>
                </div>
                
                <div className="text-right">
                  {user && user.points < cart.totalCost && (
                    <p className="text-sm text-red-600 mb-2">
                      Недостаточно баллов (не хватает {cart.totalCost - user.points})
                    </p>
                  )}
                  <button
                    onClick={proceedToCheckout}
                    disabled={!user || user.points < cart.totalCost}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Оформить заказ
                  </button>
                </div>
              </div>
              
              {user && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ваши баллы:</span>
                    <span className="font-medium">{user.points}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">К списанию:</span>
                    <span className="font-medium text-red-600">-{cart.totalCost}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Останется:</span>
                    <span className={`font-medium ${user.points - cart.totalCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {user.points - cart.totalCost}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}