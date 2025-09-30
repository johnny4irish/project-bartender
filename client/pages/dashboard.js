import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Button from '../components/ui/Button';
import { authAPI, salesAPI } from '../utils/api';

const Dashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPoints: 0,
    totalAmount: 0,
    approvedAmount: 0,
    pendingAmount: 0,
    rejectedAmount: 0,
    monthlyRank: 0,
    recentSales: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUserData(token);
  }, [router]);

  const fetchUserData = async (token) => {
    try {
      setIsLoading(true);
      
      // Загружаем данные пользователя
      const userData = await authAPI.me();
      setUser(userData);
      
      // Загружаем статистику пользователя
      const statsData = await salesAPI.stats();
      console.log('Stats data received:', statsData);
      
      // Обновляем статистику с правильными данными
      setStats({
        totalSales: statsData.totalSales ?? 0,
        totalPoints: statsData.totalPoints ?? 0,
        totalAmount: statsData.totalAmount ?? 0,
        approvedAmount: statsData.approvedAmount ?? 0,
        pendingAmount: statsData.pendingAmount ?? 0,
        rejectedAmount: statsData.rejectedAmount ?? 0,
        monthlyRank: statsData.monthlyRank ?? 0,
        recentSales: statsData.recentSales ?? []
      });
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      
      // Если статистика недоступна, используем базовые данные
      if (user) {
        setStats({
          totalSales: 0,
          totalPoints: user.points || 0,
          totalAmount: user.totalAmount || 0,
          approvedAmount: 0,
          pendingAmount: 0,
          rejectedAmount: 0,
          monthlyRank: 0,
          recentSales: []
        });
      } else {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="loading-spinner w-12 h-12"></div>
          <p className="text-gray-600">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Project Bartender</h1>
                <p className="text-gray-600 text-sm">Панель управления</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="hidden md:block text-right">
                <p className="text-gray-900 font-semibold text-lg">Привет, {user.name || 'Пользователь'}!</p>
                <p className="text-gray-600 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {user.bar || 'Не указано'} • {user.city || 'Не указан'}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Добро пожаловать в дашборд!
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Отслеживайте свои продажи, доходы и рейтинг в реальном времени
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Points */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{stats.totalPoints?.toLocaleString() || 0}</div>
                <div className="text-gray-600 text-sm">Очков</div>
              </div>
            </div>
            <div className="flex items-center text-green-600 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +12% за месяц
            </div>
          </div>

          {/* Total Earnings */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{stats.totalAmount?.toLocaleString() || 0} ₽</div>
                <div className="text-gray-600 text-sm">Общая сумма</div>
                <div className="text-green-600 text-xs">Одобрено: {stats.approvedAmount?.toLocaleString() || 0} ₽</div>
              </div>
            </div>
            <div className="flex items-center text-green-600 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Ожидает: {stats.pendingAmount?.toLocaleString() || 0} ₽
            </div>
          </div>

          {/* Monthly Sales */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{stats.totalSales}</div>
                <div className="text-gray-600 text-sm">Продаж в месяце</div>
              </div>
            </div>
            <div className="flex items-center text-green-600 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +15% за месяц
            </div>
          </div>

          {/* Monthly Rank */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">#{stats.monthlyRank}</div>
                <div className="text-gray-600 text-sm">Рейтинг</div>
              </div>
            </div>
            <div className="flex items-center text-yellow-600 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Топ 3 место
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-gray-600">
                  {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{user.name || 'Пользователь'}</h3>
                  <p className="text-gray-600">{user.email || 'Не указан'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600">Заведение</span>
                  <span className="text-gray-900 font-medium">{user.bar || 'Не указано'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600">Город</span>
                  <span className="text-gray-900 font-medium">{user.city || 'Не указан'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600">Рейтинг</span>
                  <span className="text-yellow-600 font-bold">#{stats.monthlyRank}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Статус</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Активен</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Быстрые действия</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/sales" className="group">
                  <div className="p-6 bg-blue-50 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-300 group-hover:scale-105">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h4 className="text-gray-900 font-semibold mb-2">Добавить продажу</h4>
                    <p className="text-gray-600 text-sm">Зарегистрируйте новую продажу и получите очки</p>
                  </div>
                </Link>

                <Link href="/payments" className="group">
                  <div className="p-6 bg-green-50 rounded-xl border border-green-200 hover:border-green-300 transition-all duration-300 group-hover:scale-105">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-gray-900 font-semibold mb-2">Вывести средства</h4>
                    <p className="text-gray-600 text-sm">Выведите заработанные деньги на карту</p>
                  </div>
                </Link>

                <Link href="/gamification" className="group">
                  <div className="p-6 bg-purple-50 rounded-xl border border-purple-200 hover:border-purple-300 transition-all duration-300 group-hover:scale-105">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="text-gray-900 font-semibold mb-2">Обменять очки</h4>
                    <p className="text-gray-600 text-sm">Обменяйте очки на призы и подарки</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Последние продажи</h3>
              <Link href="/sales" className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium">
                Посмотреть все →
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Продукт</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Бренд</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentSales && stats.recentSales.length > 0 ? (
                  stats.recentSales.map((sale, index) => (
                    <tr key={sale._id || `sale-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.product}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.brand}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(sale.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-green-600">{sale.price?.toLocaleString() || 0} ₽</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      Нет данных о продажах
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Навигация по разделам</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/sales" className="group">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-300 text-center group-hover:scale-105">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="text-gray-900 font-medium mb-1">Продажи</div>
                  <div className="text-gray-600 text-sm">Управление продажами</div>
                </div>
              </Link>

              <Link href="/payments" className="group">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 hover:border-green-300 transition-all duration-300 text-center group-hover:scale-105">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="text-gray-900 font-medium mb-1">Выплаты</div>
                  <div className="text-gray-600 text-sm">История и вывод средств</div>
                </div>
              </Link>

              <Link href="/gamification" className="group">
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 hover:border-purple-300 transition-all duration-300 text-center group-hover:scale-105">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="text-gray-900 font-medium mb-1">Геймификация</div>
                  <div className="text-gray-600 text-sm">Очки и призы</div>
                </div>
              </Link>

              {(() => {
                // Проверяем роль пользователя (может быть строкой или объектом)
                const userRole = typeof user.role === 'string' ? user.role : user.role?.name;
                return (userRole === 'admin' || userRole === 'brand_representative');
              })() && (
                <Link href="/admin" className="group">
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 hover:border-orange-300 transition-all duration-300 text-center group-hover:scale-105">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="text-gray-900 font-medium mb-1">Админка</div>
                    <div className="text-gray-600 text-sm">Панель управления</div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;