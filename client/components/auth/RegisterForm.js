import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '',
    bar: '',
    city: '',
    age: '',
    agreeToTerms: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Справочные данные
  const [cities, setCities] = useState([])
  const [bars, setBars] = useState([])
  const [roles, setRoles] = useState([])
  const [filteredBars, setFilteredBars] = useState([])

  const { name, email, phone, password, confirmPassword, role, bar, city, age, agreeToTerms } = formData
  const { register, loading } = useAuth()
  const router = useRouter()

  // Загрузка справочных данных
  useEffect(() => {
    const loadData = async () => {
      try {
        const [citiesRes, barsRes, rolesRes] = await Promise.all([
          axios.get('/api/data/cities'),
          axios.get('/api/data/bars'),
          axios.get('/api/data/roles')
        ])
        
        setCities(citiesRes.data)
        setBars(barsRes.data)
        setRoles(rolesRes.data)
      } catch (error) {
        console.error('Ошибка загрузки справочных данных:', error)
      }
    }
    
    loadData()
  }, [])

  // Фильтрация баров по выбранному городу
  useEffect(() => {
    if (city) {
      const filtered = bars.filter(barItem => barItem.city._id === city)
      setFilteredBars(filtered)
      // Сбрасываем выбранный бар если он не подходит к новому городу
      if (bar && !filtered.find(barItem => barItem._id === bar)) {
        setFormData(prev => ({ ...prev, bar: '' }))
      }
    } else {
      setFilteredBars([])
      setFormData(prev => ({ ...prev, bar: '' }))
    }
  }, [city, bars, bar])

  const onChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      alert('Пароли не совпадают')
      return
    }

    if (parseInt(age) < 18) {
      alert('Вам должно быть не менее 18 лет')
      return
    }

    if (!agreeToTerms) {
      alert('Необходимо согласиться с условиями использования')
      return
    }

    if (!city || !bar || !role) {
      alert('Пожалуйста, выберите город, бар и роль')
      return
    }

    // Подготавливаем данные для отправки с ObjectId
    const registrationData = {
      name, 
      email, 
      phone, 
      password, 
      role,  // ObjectId
      bar,   // ObjectId
      city,  // ObjectId
      age: parseInt(age)
    }

    await register(registrationData)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-2">
            Регистрация
          </h2>
          <p className="text-gray-600 text-sm">
            Или{' '}
            <Link href="/login" className="font-medium text-gray-900 hover:text-gray-700">
              войдите в систему
            </Link>
          </p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <form className="space-y-6" onSubmit={onSubmit}>
            {/* Полное имя */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Полное имя
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input"
                placeholder="Введите ваше полное имя"
                value={name}
                onChange={onChange}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email адрес
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="Введите email адрес"
                value={email}
                onChange={onChange}
              />
            </div>

            {/* Телефон */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Номер телефона
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="input"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={onChange}
              />
            </div>

            {/* Возраст */}
            <div className="space-y-2">
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                Возраст
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="18"
                max="100"
                required
                className="input"
                placeholder="Введите ваш возраст"
                value={age}
                onChange={onChange}
              />
              {age && parseInt(age) < 18 && (
                <p className="mt-2 text-sm text-red-600">Вам должно быть не менее 18 лет</p>
              )}
            </div>

            {/* Роль */}
            <div className="space-y-2">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Роль
              </label>
              <select
                id="role"
                name="role"
                required
                className="input appearance-none cursor-pointer"
                value={role}
                onChange={onChange}
              >
                <option value="">Выберите роль</option>
                {roles.map((roleItem) => (
                  <option key={roleItem._id} value={roleItem._id}>
                    {roleItem.displayName || roleItem.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Город */}
            <div className="space-y-2">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                Город
              </label>
              <select
                id="city"
                name="city"
                required
                className="input appearance-none cursor-pointer"
                value={city}
                onChange={onChange}
              >
                <option value="">Выберите город</option>
                {cities.map((cityItem) => (
                  <option key={cityItem._id} value={cityItem._id}>
                    {cityItem.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Бар */}
            <div className="space-y-2">
              <label htmlFor="bar" className="block text-sm font-medium text-gray-700">
                Бар
              </label>
              <select
                id="bar"
                name="bar"
                required
                className="input appearance-none cursor-pointer"
                value={bar}
                onChange={onChange}
                disabled={!city}
              >
                <option value="">
                  {city ? 'Выберите бар' : 'Сначала выберите город'}
                </option>
                {filteredBars.map((barItem) => (
                  <option key={barItem._id} value={barItem._id}>
                    {barItem.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Пароль */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input pr-10"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={onChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Подтверждение пароля */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Подтвердите пароль
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="input pr-10"
                  placeholder="Подтвердите пароль"
                  value={confirmPassword}
                  onChange={onChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Согласие с условиями */}
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  className="h-4 w-4 mt-0.5 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                  checked={agreeToTerms}
                  onChange={onChange}
                />
                <label htmlFor="agreeToTerms" className="block text-sm text-gray-700 leading-relaxed">
                  Я согласен с{' '}
                  <Link href="/terms" className="text-gray-900 hover:text-gray-700 underline">
                    условиями использования
                  </Link>{' '}
                  и{' '}
                  <Link href="/privacy" className="text-gray-900 hover:text-gray-700 underline">
                    политикой конфиденциальности
                  </Link>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || parseInt(age) < 18 || !agreeToTerms}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-4 h-4 mr-2"></div>
                  Регистрация...
                </div>
              ) : (
                'Зарегистрироваться'
              )}
            </button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors text-sm">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterForm