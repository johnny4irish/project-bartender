import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import { authAPI, adminAPI } from '../../utils/api';

const AdminSales = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingSales: 0,
    approvedSales: 0,
    rejectedSales: 0,
    totalRevenue: 0,
    averageSale: 0
  });

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching sales with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch('/api/admin/sales', {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`Ошибка загрузки продаж: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Sales data received:', data);
      const salesData = data.sales || [];
      setSales(salesData);
      
      // Вычисляем статистику
      const totalSales = salesData.length;
      const pendingSales = salesData.filter(s => s.verificationStatus === 'pending').length;
      const approvedSales = salesData.filter(s => s.verificationStatus === 'approved').length;
      const rejectedSales = salesData.filter(s => s.verificationStatus === 'rejected').length;
      const totalRevenue = salesData.filter(s => s.verificationStatus === 'approved').reduce((sum, s) => sum + (s.price || 0), 0);
      const averageSale = approvedSales > 0 ? Math.round(totalRevenue / approvedSales) : 0;
      
      setStats({
        totalSales,
        pendingSales,
        approvedSales,
        rejectedSales,
        totalRevenue,
        averageSale
      });
    } catch (error) {
      console.error('Ошибка загрузки продаж:', error);
      setError('Ошибка загрузки продаж');
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки данных пользователя');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCurrentUser(), fetchSales()]);
      setIsLoading(false);
    };

    loadData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleApproveSale = async (saleId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Approving sale:', saleId, 'with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(`/api/admin/sales/${saleId}/verify`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved' })
      });

      console.log('Approve response status:', response.status);
      console.log('Approve response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Approve error response:', errorText);
        throw new Error(`Ошибка при одобрении продажи: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Approve success:', result);

      // Обновляем список продаж
      await fetchSales();
      setError('');
    } catch (error) {
      console.error('Ошибка при одобрении продажи:', error);
      setError(`Ошибка при одобрении продажи: ${error.message}`);
    }
  };

  const handleRejectSale = async (saleId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Rejecting sale:', saleId, 'with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(`/api/admin/sales/${saleId}/verify`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rejected' })
      });

      console.log('Reject response status:', response.status);
      console.log('Reject response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Reject error response:', errorText);
        throw new Error(`Ошибка при отклонении продажи: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Reject success:', result);

      // Обновляем список продаж
      await fetchSales();
      setError('');
    } catch (error) {
      console.error('Ошибка при отклонении продажи:', error);
      setError(`Ошибка при отклонении продажи: ${error.message}`);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'На рассмотрении';
      case 'approved': return 'Одобрено';
      case 'rejected': return 'Отклонено';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role) => {
    // Если роль - строка
    if (typeof role === 'string') {
      switch (role) {
        case 'admin': return 'Администратор';
        case 'brand_representative': return 'Представитель бренда';
        case 'bartender': return 'Бармен';
        default: return role;
      }
    }
    
    // Если роль - объект с полем name или displayName
    if (role && typeof role === 'object') {
      const roleName = role.name || role.displayName;
      switch (roleName) {
        case 'admin': return 'Администратор';
        case 'brand_representative': return 'Представитель бренда';
        case 'bartender': return 'Бармен';
        default: return roleName || 'Неизвестная роль';
      }
    }
    
    return 'Неизвестная роль';
  };

  // Фильтрация продаж
  const filteredSales = sales.filter(sale => {
    const matchesStatus = statusFilter === 'all' || sale.verificationStatus === statusFilter;
    const matchesSearch = !searchTerm || 
      sale.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.bar?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const saleDate = new Date(sale.createdAt);
      if (dateFrom) {
        matchesDate = matchesDate && saleDate >= new Date(dateFrom);
      }
      if (dateTo) {
        matchesDate = matchesDate && saleDate <= new Date(dateTo + 'T23:59:59');
      }
    }
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Управление продажами</h1>
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 text-sm">
                ← К админ-панели
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-gray-900 font-medium">Привет, {user.name}!</p>
                <p className="text-gray-600 text-sm">{getRoleText(user.role)}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Всего продаж</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalSales}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">На рассмотрении</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingSales}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Одобрено</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.approvedSales}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Отклонено</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.rejectedSales}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Общий доход</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalRevenue.toLocaleString()} ₽</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Средняя продажа</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.averageSale.toLocaleString()} ₽</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Фильтры</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все статусы</option>
                <option value="pending">На рассмотрении</option>
                <option value="approved">Одобрено</option>
                <option value="rejected">Отклонено</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Поиск
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск по бармену, продукту или бару"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата от
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата до
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Список продаж</h2>
            <p className="text-gray-600 text-sm mt-1">
              Показано {filteredSales.length} из {sales.length} продаж
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Бармен
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Продукт
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Бар
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
                {filteredSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {sale.user?.name?.charAt(0)?.toUpperCase() || 'B'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.user?.name || 'Неизвестный бармен'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.user?.email || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.product || 'Не указан'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.bar || 'Не указан'}
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
                      {new Date(sale.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {sale.verificationStatus === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveSale(sale._id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Одобрить
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRejectSale(sale._id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Отклонить
                          </Button>
                        </div>
                      )}
                      {sale.status !== 'pending' && (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSales.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Продажи не найдены</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminSales;