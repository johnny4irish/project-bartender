import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import { authAPI, adminAPI, API_BASE_URL } from '../../utils/api';

const AdminTransactions = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalPointsEarned: 0,
    totalPointsSpent: 0,
    averageTransaction: 0
  });

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки транзакций');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      
      // Вычисляем статистику
      const transactionsData = data.transactions || [];
      const totalTransactions = transactionsData.length;
      const totalPointsEarned = transactionsData.filter(t => t.type === 'earned').reduce((sum, t) => sum + t.amount, 0);
      const totalPointsSpent = transactionsData.filter(t => t.type === 'spent').reduce((sum, t) => sum + t.amount, 0);
      const averageTransaction = totalTransactions > 0 ? Math.round((totalPointsEarned + totalPointsSpent) / totalTransactions) : 0;
      
      setStats({
        totalTransactions,
        totalPointsEarned,
        totalPointsSpent,
        averageTransaction
      });
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
      setError('Ошибка загрузки транзакций');
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
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
      await Promise.all([fetchCurrentUser(), fetchTransactions()]);
      setIsLoading(false);
    };

    loadData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'earned': return 'Начислено';
      case 'spent': return 'Потрачено';
      case 'bonus': return 'Бонус';
      case 'penalty': return 'Штраф';
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'earned': return 'bg-green-100 text-green-800';
      case 'spent': return 'bg-red-100 text-red-800';
      case 'bonus': return 'bg-blue-100 text-blue-800';
      case 'penalty': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role) => {
    // Если роль - строка
    if (typeof role === 'string') {
      switch (role) {
        case 'admin': return 'Администратор';
        case 'brand_representative': return 'Представитель бренда';
        case 'bar_manager': return 'Менеджер бара';
        case 'test_bartender': return 'Тест-бармен';
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
        case 'bar_manager': return 'Менеджер бара';
        case 'test_bartender': return 'Тест-бармен';
        case 'bartender': return 'Бармен';
        default: return roleName || 'Неизвестная роль';
      }
    }
    
    return 'Неизвестная роль';
  };

  // Фильтрация транзакций
  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesSearch = !searchTerm || 
      transaction.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const transactionDate = new Date(transaction.createdAt);
      if (dateFrom) {
        matchesDate = matchesDate && transactionDate >= new Date(dateFrom);
      }
      if (dateTo) {
        matchesDate = matchesDate && transactionDate <= new Date(dateTo + 'T23:59:59');
      }
    }
    
    return matchesType && matchesSearch && matchesDate;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Проверяем доступ к админ-панели с улучшенной логикой
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
              <h1 className="text-xl font-bold text-gray-900">Управление транзакциями</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Всего транзакций</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalTransactions}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Начислено баллов</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalPointsEarned.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Потрачено баллов</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalPointsSpent.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Средняя транзакция</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.averageTransaction}</dd>
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
                Тип транзакции
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все типы</option>
                <option value="earned">Начислено</option>
                <option value="spent">Потрачено</option>
                <option value="bonus">Бонус</option>
                <option value="penalty">Штраф</option>
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
                placeholder="Поиск по пользователю или описанию"
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

        {/* Transactions Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">История транзакций</h2>
            <p className="text-gray-600 text-sm mt-1">
              Показано {filteredTransactions.length} из {transactions.length} транзакций
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Баллы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Описание
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {transaction.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.user?.name || 'Неизвестный пользователь'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.user?.email || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(transaction.type)}`}>
                        {getTypeText(transaction.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.type === 'earned' || transaction.type === 'bonus' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'earned' || transaction.type === 'bonus' ? '+' : '-'}{transaction.amount?.toLocaleString() || 0} ₽
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Транзакции не найдены</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminTransactions;