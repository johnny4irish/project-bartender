import { createContext, useContext, useReducer, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

// Настройка базового URL для axios
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
// Всегда отправлять cookies для кросс-доменных запросов (HttpOnly JWT)
axios.defaults.withCredentials = true

const AuthContext = createContext()

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token)
      return {
        ...state,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        user: action.payload.user
      }
    case 'LOGIN_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token')
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null
      }
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload
      }
    case 'AUTH_ERROR':
      localStorage.removeItem('token')
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null
      }
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      }
    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const initialState = {
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
    isAuthenticated: false,
    loading: true,
    user: null
  }

  const [state, dispatch] = useReducer(authReducer, initialState)

  // Загрузка пользователя
  const loadUser = async () => {
    console.log('AuthContext: loadUser - начинаем загрузку пользователя')
    console.log('AuthContext: loadUser - localStorage.token:', localStorage.token)
    
    // Если токена нет — не дергаем /api/auth/me, сразу сбрасываем состояние
    if (!localStorage.token) {
      console.log('AuthContext: loadUser - токен отсутствует, пропускаем запрос /api/auth/me')
      dispatch({ type: 'AUTH_ERROR' })
      return
    }

    console.log('AuthContext: loadUser - устанавливаем токен из localStorage')
    setAuthToken(localStorage.token)

    console.log('AuthContext: loadUser - текущие заголовки axios:', axios.defaults.headers.common)

    try {
      console.log('AuthContext: loadUser - отправляем GET запрос на /api/auth/me')
      const res = await axios.get('/api/auth/me')
      console.log('AuthContext: loadUser - получен ответ:', res.data)
      dispatch({
        type: 'USER_LOADED',
        payload: res.data
      })
    } catch (err) {
      console.error('AuthContext: loadUser - ошибка:', err)
      console.error('AuthContext: loadUser - ответ сервера:', err.response?.data)
      dispatch({ type: 'AUTH_ERROR' })
    }
  }

  // Регистрация пользователя
  const register = async (formData) => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const res = await axios.post('/api/auth/register', formData, config)
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data
      })

      toast.success('Регистрация прошла успешно!')
      loadUser()
    } catch (err) {
      const errors = err.response.data.errors
      if (errors) {
        errors.forEach(error => toast.error(error.msg))
      } else {
        toast.error(err.response.data.msg || 'Ошибка регистрации')
      }
      dispatch({ type: 'LOGIN_FAIL' })
    }
  }

  // Вход пользователя
  const login = async (formData) => {
    console.log('AuthContext: Начинаем процесс login', { email: formData.email })
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      console.log('AuthContext: Отправляем запрос на /api/auth/login')
      
      const res = await axios.post('/api/auth/login', formData, config)
      console.log('AuthContext: Получен ответ от сервера:', res.data)
      
      // Сначала сохраняем токен в localStorage
      console.log('AuthContext: Сохраняем токен в localStorage')
      localStorage.setItem('token', res.data.token)
      
      // Устанавливаем токен в заголовки
      console.log('AuthContext: Устанавливаем токен в заголовки')
      setAuthToken(res.data.token)
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data
      })

      toast.success('Вход выполнен успешно!')
      console.log('AuthContext: Возвращаем success: true (loadUser будет вызван автоматически через useEffect)')
      return { success: true }
    } catch (err) {
      console.error('AuthContext: Ошибка при входе:', err)
      console.error('AuthContext: Ответ сервера:', err.response?.data)
      
      const errors = err.response?.data?.errors
      if (errors) {
        errors.forEach(error => toast.error(error.msg))
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.msg || 'Ошибка входа')
      }
      dispatch({ type: 'LOGIN_FAIL' })
      throw new Error('Login failed')
    }
  }

  // Выход пользователя
  const logout = () => {
    dispatch({ type: 'LOGOUT' })
    toast.info('Вы вышли из системы')
  }

  // Установка токена в заголовки
  const setAuthToken = (token) => {
    console.log('AuthContext: setAuthToken - устанавливаем токен:', token ? 'есть токен' : 'токен отсутствует')
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token
      console.log('AuthContext: setAuthToken - токен установлен в заголовки')
    } else {
      delete axios.defaults.headers.common['x-auth-token']
      console.log('AuthContext: setAuthToken - токен удален из заголовков')
    }
    console.log('AuthContext: setAuthToken - текущие заголовки:', axios.defaults.headers.common)
  }

  useEffect(() => {
    loadUser()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        user: state.user,
        register,
        login,
        logout,
        loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}