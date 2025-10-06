import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useRouter } from 'next/router'

const WithdrawPage = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState(null)
  const [methods, setMethods] = useState([])
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    amount: '',
    phoneNumber: '',
    bankName: '',
    method: 'sbp'
  })
  
  const [calculatedData, setCalculatedData] = useState({
    commission: 0,
    amountToReceive: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchBalance()
      fetchMethods()
    }
  }, [user, loading])

  useEffect(() => {
    if (formData.amount && balance) {
      const amount = parseFloat(formData.amount) || 0
      const commission = Math.round(amount * balance.commissionRate)
      const amountToReceive = amount - commission
      
      setCalculatedData({
        commission,
        amountToReceive: Math.max(0, amountToReceive)
      })
    } else {
      setCalculatedData({ commission: 0, amountToReceive: 0 })
    }
  }, [formData.amount, balance])

  const fetchBalance = async () => {
    try {
      const res = await axios.get('/api/payments/balance')
      setBalance(res.data)
    } catch (error) {
      console.error('Ошибка загрузки баланса:', error)
      toast.error('Ошибка загрузки баланса')
    } finally {
      setLoadingBalance(false)
    }
  }

  const fetchMethods = async () => {
    try {
      const res = await axios.get('/api/payments/methods')
      setMethods(res.data)
    } catch (error) {
      console.error('Ошибка загрузки методов:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const formatPhoneNumber = (value) => {
    // Удаляем все нецифровые символы
    const digits = value.replace(/\D/g, '')
    
    // Ограничиваем до 11 цифр (российский номер)
    const limited = digits.slice(0, 11)
    
    // Форматируем номер
    if (limited.length === 0) return ''
    if (limited.length <= 1) return `+${limited}`
    if (limited.length <= 4) return `+${limited.slice(0, 1)} (${limited.slice(1)}`
    if (limited.length <= 7) return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4)}`
    if (limited.length <= 9) return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7)}`
    return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7, 9)}-${limited.slice(9)}`
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData(prev => ({
      ...prev,
      phoneNumber: formatted
    }))
  }

  const validateForm = () => {
    if (!formData.amount) {
      toast.error('Укажите сумму для вывода')
      return false
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Укажите корректную сумму')
      return false
    }

    if (!balance) {
      toast.error('Данные баланса не загружены')
      return false
    }

    if (amount < balance.minWithdrawAmount) {
      toast.error(`Минимальная сумма для вывода: ${balance.minWithdrawAmount} ₽`)
      return false
    }

    if (amount > balance.maxWithdrawAmount) {
      toast.error(`Максимальная сумма для вывода: ${balance.maxWithdrawAmount.toLocaleString()} ₽`)
      return false
    }

    if (amount > balance.availableBalance) {
      toast.error(`Недостаточно средств. Доступно: ${balance.availableBalance} ₽`)
      return false
    }

    if (!formData.phoneNumber) {
      toast.error('Укажите номер телефона')
      return false
    }

    // Проверяем формат номера (должно быть 11 цифр)
    const digits = formData.phoneNumber.replace(/\D/g, '')
    if (digits.length !== 11 || !digits.startsWith('7')) {
      toast.error('Укажите корректный российский номер телефона')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const submitData = {
        amount: parseFloat(formData.amount),
        phoneNumber: formData.phoneNumber,
        bankName: formData.bankName || 'Не указан'
      }

      const res = await axios.post('/api/payments/withdraw', submitData)
      
      toast.success('Запрос на вывод средств создан!')
      
      // Показываем детали транзакции
      const transaction = res.data.transaction
      toast.info(
        `Сумма к получению: ${transaction.amountToReceive} ₽\n` +
        `Комиссия: ${transaction.commission} ₽\n` +
        `Время обработки: ${transaction.estimatedProcessingTime}`,
        { autoClose: 10000 }
      )

      // Перенаправляем на страницу платежей
      setTimeout(() => {
        router.push('/payments')
      }, 2000)
      
    } catch (error) {
      console.error('Ошибка создания запроса:', error)
      const message = error.response?.data?.msg || 'Ошибка создания запроса на вывод'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const setQuickAmount = (percentage) => {
    if (!balance) return
    const amount = Math.floor(balance.availableBalance * percentage)
    setFormData(prev => ({
      ...prev,
      amount: amount.toString()
    }))
  }

  if (loading || loadingBalance) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!balance) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ошибка загрузки</h2>
          <p className="text-gray-600 mb-4">Не удалось загрузить данные баланса</p>
          <button
            onClick={() => router.push('/payments')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Вернуться к платежам
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/payments')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Назад к платежам
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Вывод средств</h1>
          <p className="mt-2 text-gray-600">
            Выведите заработанные средства на свой банковский счет
          </p>
        </div>

        {/* Информация о балансе */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ваш баланс</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Доступно к выводу</p>
              <p className="text-2xl font-bold text-green-600">
                {balance.availableBalance?.toLocaleString() || 0} ₽
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Общий заработок</p>
              <p className="text-xl font-semibold text-gray-900">
                {balance.totalEarnings?.toLocaleString() || 0} ₽
              </p>
            </div>
          </div>
        </div>

        {/* Проверка минимальной суммы */}
        {balance.availableBalance < balance.minWithdrawAmount && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Недостаточно средств для вывода
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Минимальная сумма для вывода: {balance.minWithdrawAmount} ₽<br/>
                    Ваш доступный баланс: {balance.availableBalance} ₽<br/>
                    Необходимо заработать еще: {balance.minWithdrawAmount - balance.availableBalance} ₽
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/sales/add')}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm"
                  >
                    Добавить продажу
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Форма вывода */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Запрос на вывод средств
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Сумма */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сумма для вывода (₽)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  min={balance.minWithdrawAmount}
                  max={Math.min(balance.availableBalance, balance.maxWithdrawAmount)}
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`От ${balance.minWithdrawAmount} до ${Math.min(balance.availableBalance, balance.maxWithdrawAmount).toLocaleString()}`}
                  disabled={balance.availableBalance < balance.minWithdrawAmount}
                />
              </div>
              
              {/* Быстрый выбор суммы */}
              {balance.availableBalance >= balance.minWithdrawAmount && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAmount(0.25)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAmount(0.5)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAmount(0.75)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAmount(1)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    Все
                  </button>
                </div>
              )}
            </div>

            {/* Расчет комиссии */}
            {formData.amount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Расчет к получению:</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Сумма к выводу:</span>
                    <span>{parseFloat(formData.amount).toLocaleString()} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Комиссия ({(balance.commissionRate * 100)}%):</span>
                    <span>-{calculatedData.commission.toLocaleString()} ₽</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-blue-300 pt-1">
                    <span>К получению:</span>
                    <span>{calculatedData.amountToReceive.toLocaleString()} ₽</span>
                  </div>
                </div>
              </div>
            )}

            {/* Номер телефона */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер телефона (привязанный к банковской карте)
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+7 (999) 123-45-67"
                disabled={balance.availableBalance < balance.minWithdrawAmount}
              />
              <p className="mt-1 text-xs text-gray-500">
                Номер должен быть привязан к банковской карте, поддерживающей СБП
              </p>
            </div>

            {/* Название банка */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название банка (необязательно)
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: Сбербанк, ВТБ, Тинькофф"
                disabled={balance.availableBalance < balance.minWithdrawAmount}
              />
            </div>

            {/* Информация о СБП */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                💳 Система быстрых платежей (СБП)
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Мгновенные переводы по номеру телефона</li>
                <li>• Работает круглосуточно, включая выходные</li>
                <li>• Поддерживается большинством российских банков</li>
                <li>• Время обработки: 5-10 минут</li>
                <li>• Безопасно и надежно</li>
              </ul>
            </div>

            {/* Кнопка отправки */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting || balance.availableBalance < balance.minWithdrawAmount}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Обработка...
                  </div>
                ) : (
                  'Создать запрос на вывод'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/payments')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>

        {/* Дополнительная информация */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            ⚠️ Важная информация
          </h3>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Убедитесь, что номер телефона привязан к банковской карте</li>
            <li>• Проверьте, что ваш банк поддерживает СБП</li>
            <li>• Запрос нельзя отменить после начала обработки</li>
            <li>• При возникновении проблем обратитесь в поддержку</li>
            <li>• Средства поступят на счет в течение 5-10 минут</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default WithdrawPage