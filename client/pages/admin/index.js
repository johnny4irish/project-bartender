import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import { authAPI, adminAPI } from '../../utils/api';

const AdminDashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBartenders: 0,
    totalSales: 0,
    pendingSales: 0,
    totalRevenue: 0,
    totalPoints: 0,
    recentSales: [],
    topBartenders: [],
    salesByMonth: [],
    usersByRole: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchCurrentUser();
    fetchDashboardStats();
  }, [router]);

  const fetchCurrentUser = async () => {
    try {
      const userData = await authAPI.me();
      setUser(userData);
    } catch (error) {
      console.error('Ошибка при получении данных пользователя:', error);
      router.push('/login');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const data = await adminAPI.dashboard();
      setStats(data);
    } catch (error) {
      console.error('Ошибка при получении статистики:', error);
      setError('Ошибка при загрузке статистики');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Проверяем доступ к админ-панели
  const hasAdminAccess = () => {
    if (!user) return false;
    
    // Если роль - строка
    if (typeof user.role === 'string') {
      return user.role === 'admin' || user.role === 'brand_representative';
    }
    
    // Если роль - объект с полем name
    if (user.role && typeof user.role === 'object' && user.role.name) {
      return user.role.name === 'admin' || user.role.name === 'brand_representative';
    }
    
    return false;
  };

  // Админам и представителям бренда сразу показываем единый кабинет
  useEffect(() => {
    if (user && hasAdminAccess()) {
      router.replace('/dashboard');
    }
  }, [user]);

  if (!hasAdminAccess()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Доступ запрещен</h1>
          <p className="text-gray-600 mb-4">У вас нет прав для доступа к админ-панели</p>
          <Button onClick={() => router.push('/')}>
            На главную
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Админ-панель</h1>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm">
                ← К пользовательской панели
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="text-left sm:text-right">
                <p className="text-gray-900 font-medium text-sm sm:text-base">Привет, {user.name}!</p>
                <p className="text-gray-600 text-xs sm:text-sm">
                  {user.role === 'admin' ? 'Администратор' : 'Представитель бренда'}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout} className="w-full sm:w-auto">
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Всего пользователей</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Всего барменов</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBartenders}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Всего продаж</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
                <p className="text-sm text-orange-600">На модерации: {stats.pendingSales}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Общий доход</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue?.toLocaleString()} ₽</p>
                <p className="text-sm text-gray-600">Баллов: {stats.totalPoints?.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 sm:mb-8">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Управление</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              <Link href="/admin/sales" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <h3 className="text-gray-900 font-medium mb-2">Модерация продаж</h3>
                <p className="text-gray-600 text-sm">Проверка и подтверждение продаж</p>
                {stats.pendingSales > 0 && (
                  <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    {stats.pendingSales} на модерации
                  </span>
                )}
              </Link>
              <Link href="/admin/users" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <h3 className="text-gray-900 font-medium mb-2">Управление пользователями</h3>
                <p className="text-gray-600 text-sm">Просмотр и редактирование пользователей</p>
              </Link>
              <Link href="/admin/products" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <h3 className="text-gray-900 font-medium mb-2">Управление продуктами</h3>
                <p className="text-gray-600 text-sm">Настройка начисления баллов по продуктам</p>
              </Link>
              <Link href="/admin/prizes" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <h3 className="text-gray-900 font-medium mb-2">Управление призами</h3>
                <p className="text-gray-600 text-sm">Настройка призов и наград</p>
              </Link>
              <Link href="/admin/transactions" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <h3 className="text-gray-900 font-medium mb-2">История транзакций</h3>
                <p className="text-gray-600 text-sm">Просмотр всех транзакций</p>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          {/* Recent Sales */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Последние продажи</h2>
            </div>
            <div className="p-4 sm:p-6">
              {stats.recentSales && stats.recentSales.length > 0 ? (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 sm:px-0 text-gray-900 font-medium text-xs sm:text-sm">Бармен</th>
                          <th className="text-left py-3 px-2 sm:px-0 text-gray-900 font-medium text-xs sm:text-sm">Продукт</th>
                          <th className="text-left py-3 px-2 sm:px-0 text-gray-900 font-medium text-xs sm:text-sm">Дата</th>
                          <th className="text-right py-3 px-2 sm:px-0 text-gray-900 font-medium text-xs sm:text-sm">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {stats.recentSales.slice(0, 5).map((sale, index) => (
                          <tr key={sale._id || index}>
                            <td className="py-3 px-2 sm:px-0 text-gray-900 text-xs sm:text-sm truncate max-w-[100px]">{sale.bartender?.name || 'Неизвестно'}</td>
                            <td className="py-3 px-2 sm:px-0 text-gray-600 text-xs sm:text-sm truncate max-w-[120px]">{sale.product}</td>
                            <td className="py-3 px-2 sm:px-0 text-gray-600 text-xs sm:text-sm whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                            <td className="py-3 px-2 sm:px-0 text-right text-gray-900 font-medium text-xs sm:text-sm whitespace-nowrap">{sale.price?.toLocaleString()} ₽</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4 text-sm">Нет данных о продажах</p>
              )}
            </div>
          </div>

          {/* Top Bartenders */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Топ барменов</h2>
            </div>
            <div className="p-4 sm:p-6">
              {stats.topBartenders && stats.topBartenders.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {stats.topBartenders.slice(0, 5).map((bartender, index) => (
                    <div key={bartender._id || index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs sm:text-sm font-medium text-gray-600">#{index + 1}</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-900 font-medium text-xs sm:text-sm truncate">{bartender.name}</p>
                          <p className="text-gray-600 text-xs truncate">{bartender.bar} • {bartender.city}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-gray-900 font-medium text-xs sm:text-sm">{bartender.totalSales} продаж</p>
                        <p className="text-gray-600 text-xs">{bartender.totalAmount?.toLocaleString()} ₽</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4 text-sm">Нет данных о барменах</p>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;