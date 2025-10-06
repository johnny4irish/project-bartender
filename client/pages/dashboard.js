import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Button from '../components/ui/Button';
import { authAPI, salesAPI, adminAPI, API_BASE_URL } from '../utils/api';
import axios from 'axios';
import { toast } from 'react-toastify';

const Dashboard = ({ achievementsHtml }) => {
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
  const [cityName, setCityName] = useState('');
  const [barName, setBarName] = useState('');
  const [brandMap, setBrandMap] = useState({});
  const [adminStats, setAdminStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [addSaleForm, setAddSaleForm] = useState({ productId: '', quantity: 1, proofType: 'receipt' });
  const [addSaleFile, setAddSaleFile] = useState(null);
  const [addSaleLoading, setAddSaleLoading] = useState(false);
  // Геймификация: локальное состояние для карточек (очки, достижения, рейтинг, уровень)
  const [gamiStats, setGamiStats] = useState({ points: 0, achievementsCount: 0, rank: null, level: 1 });
  const [gamiLoading, setGamiLoading] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);

  // Подсчёт количества продаж по статусам на основе последних продаж
  const approvedCount = (stats?.recentSales || []).filter(s => s.verificationStatus === 'approved').length;
  const pendingCount = (stats?.recentSales || []).filter(s => s.verificationStatus === 'pending').length;

  const hasAdminAccess = (u) => {
    if (!u) return false;
    if (typeof u.role === 'string') {
      return u.role === 'admin' || u.role === 'brand_representative';
    }
    if (u.role && typeof u.role === 'object' && u.role.name) {
      return u.role.name === 'admin' || u.role.name === 'brand_representative';
    }
    return false;
  };

  const handleAchievementsClick = (e) => {
    if (hasAdminAccess(user)) {
      e.preventDefault();
      setShowAchievementsModal(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUserData(token);
  }, [router]);

  // Загружаем данные геймификации для мини-карточек на дашборде
  useEffect(() => {
    const fetchGamification = async () => {
      if (!user) return;
      try {
        setGamiLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { 'x-auth-token': token } : {};
        const [statsRes, achievementsRes] = await Promise.all([
          axios.get('/api/gamification/stats', { headers }),
          axios.get('/api/gamification/achievements', { headers })
        ]);

        const s = statsRes?.data || {};
        const achievementsCount = s.achievementsCount ?? achievementsRes?.data?.summary?.unlocked ?? 0;

        setGamiStats({
          points: (s.user && typeof s.user.points !== 'undefined') ? s.user.points : (s.points ?? 0),
          achievementsCount,
          rank: s.rank ?? s.userRank ?? null,
          level: (typeof s.level !== 'undefined') ? s.level : (s.user?.level ?? 1)
        });
      } catch (error) {
        console.error('Ошибка загрузки данных геймификации:', error?.message || error);
        toast.error('Не удалось загрузить данные геймификации');
      } finally {
        setGamiLoading(false);
      }
    };
    fetchGamification();
  }, [user]);

  // Загружаем админ-статистику для пользователей с правами администратора
  useEffect(() => {
    const loadAdminStats = async () => {
      if (!user || !hasAdminAccess(user)) return;
      try {
        setAdminLoading(true);
        const data = await adminAPI.dashboard();
        setAdminStats(data);
      } catch (error) {
        console.error('Ошибка загрузки админ-статистики:', error?.message || error);
        setAdminError('Не удалось загрузить админ-данные');
      } finally {
        setAdminLoading(false);
      }
    };
    loadAdminStats();
  }, [user]);

  // Подгружаем русские названия города и заведения, если у пользователя сохранены ObjectId
  useEffect(() => {
    const loadRefs = async () => {
      try {
        if (user?.city) {
          // если уже есть объект с именем
          if (typeof user.city === 'object' && user.city.name) {
            setCityName(user.city.name);
          } else if (typeof user.city === 'string') {
            const { data } = await axios.get('/api/data/cities');
            const found = Array.isArray(data) ? data.find(c => c._id === user.city) : null;
            if (found?.name) setCityName(found.name);
          }
        }
        if (user?.bar) {
          if (typeof user.bar === 'object' && user.bar.name) {
            setBarName(user.bar.name);
          } else if (typeof user.bar === 'string') {
            const { data } = await axios.get('/api/data/bars');
            const found = Array.isArray(data) ? data.find(b => b._id === user.bar) : null;
            if (found?.name) setBarName(found.name);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки справочников для города/заведения:', error?.message || error);
      }
    };
    loadRefs();
  }, [user]);

  // Загружаем словарь брендов для отображения в «Последние продажи»
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/data/brands`);
        if (Array.isArray(data)) {
          const map = {};
          data.forEach(b => { map[b._id] = b.displayName || b.name; });
          setBrandMap(map);
        }
      } catch (error) {
        console.error('Ошибка загрузки брендов:', error?.message || error);
      }
    };
    loadBrands();
  }, []);

  const resolveBrandName = (brand) => {
    if (!brand) return 'Не указан';
    const isObjectId = typeof brand === 'string' && /^[a-f0-9]{24}$/i.test(brand);
    if (isObjectId) {
      return brandMap[brand] || brand;
    }
    return brand;
  };

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
                  {barName || user.bar || 'Не указано'} • {cityName || user.city || 'Не указан'}
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
        
        

        {/* Admin Panel (перемещён наверх рядом с приветствием) */}
        {hasAdminAccess(user) && (
          <div id="admin" className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
            <div className="p-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Администраторский раздел</h3>
                <div className="text-sm text-gray-600">Доступно только администраторам и представителям бренда</div>
              </div>
              {adminError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">{adminError}</div>
              )}
              {adminLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <p className="text-gray-600 text-sm font-medium">Всего пользователей</p>
                      <p className="text-2xl font-bold text-gray-900">{adminStats?.totalUsers ?? 0}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <p className="text-gray-600 text-sm font-medium">Всего барменов</p>
                      <p className="text-2xl font-bold text-gray-900">{adminStats?.totalBartenders ?? 0}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <p className="text-gray-600 text-sm font-medium">Всего продаж</p>
                      <p className="text-2xl font-bold text-gray-900">{adminStats?.totalSales ?? 0}</p>
                      <p className="text-sm text-orange-600">На модерации: {adminStats?.pendingSales ?? 0}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <p className="text-gray-600 text-sm font-medium">Общий доход</p>
                      <p className="text-2xl font-bold text-gray-900">{(adminStats?.totalRevenue ?? 0).toLocaleString()} ₽</p>
                      <p className="text-sm text-gray-600">Баллы: {(adminStats?.totalPoints ?? 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link href="/admin/users" className="group">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-300 text-center group-hover:scale-105">
                        <div className="text-gray-900 font-medium mb-1">Пользователи</div>
                        <div className="text-gray-600 text-sm">Управление пользователями</div>
                      </div>
                    </Link>
                    <Link href="/admin/products" className="group">
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200 hover:border-green-300 transition-all duration-300 text-center group-hover:scale-105">
                        <div className="text-gray-900 font-medium mb-1">Продукты</div>
                        <div className="text-gray-600 text-sm">Управление товарами</div>
                      </div>
                    </Link>
                    <Link href="/admin/transactions" className="group">
                      <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 hover:border-orange-300 transition-all duration-300 text-center group-hover:scale-105">
                        <div className="text-gray-900 font-medium mb-1">Транзакции</div>
                        <div className="text-gray-600 text-sm">Модерация и выплаты</div>
                      </div>
                    </Link>
                    <Link href="/admin/prizes" className="group">
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 hover:border-purple-300 transition-all duration-300 text-center group-hover:scale-105">
                        <div className="text-gray-900 font-medium mb-1">Призы</div>
                        <div className="text-gray-600 text-sm">Настройка призов</div>
                      </div>
                    </Link>
                    <Link href="/admin/sales" className="group">
                      <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 hover:border-yellow-300 transition-all duration-300 text-center group-hover:scale-105">
                        <div className="text-gray-900 font-medium mb-1">Продажи</div>
                        <div className="text-gray-600 text-sm">Отчетность по продажам</div>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stats and Profile: combined container */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="p-6">
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
                  {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{user?.name || 'Пользователь'}</h3>
                  <p className="text-gray-600">{user?.email || 'Не указан'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600">Заведение</span>
                  <span className="text-gray-900 font-medium">{barName || user?.bar || 'Не указано'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600">Город</span>
                  <span className="text-gray-900 font-medium">{cityName || user?.city || 'Не указан'}</span>
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
          </div>
        </div>

        {/* Раздел продаж: объединённый контейнер со статистикой и списком */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="px-4 py-6 sm:px-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Статистика продаж</h2>
              <button type="button" onClick={() => setIsAddSaleOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium">
                Добавить продажу
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Всего продаж */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700">Всего продаж</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSales || 0}</p>
                </div>
              </div>
            </div>

            {/* Одобренные */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700">Одобренные</p>
                  <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                </div>
              </div>
            </div>

            {/* На проверке */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700">На проверке</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                </div>
              </div>
            </div>

            {/* Общая сумма */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700">Общая сумма</p>
                  <p className="text-2xl font-bold text-gray-900">{(stats.totalAmount || 0).toLocaleString()} ₽</p>
                </div>
              </div>
            </div>

            {/* Заработано баллов */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700">Заработано баллов</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPoints || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Список продаж</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Товар</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Баллы</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentSales && stats.recentSales.length > 0 ? (
                    stats.recentSales.map((sale, index) => (
                      <tr key={sale._id || `sale-list-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{sale.product} - {resolveBrandName(sale.brand)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.quantity ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.price?.toLocaleString() || 0} ₽</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.pointsEarned || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.verificationStatus === 'approved' ? 'bg-green-100 text-green-800' : sale.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {sale.verificationStatus === 'approved' ? 'Одобрено' : sale.verificationStatus === 'pending' ? 'На проверке' : 'Отклонено'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sale.createdAt).toLocaleString('ru-RU')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-gray-600 hover:text-gray-900 mr-4">Просмотр</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Нет данных о продажах</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>

        {/* Gamification Section (from 66.txt) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Геймификация</h3>
            <p className="mt-1 text-gray-600 text-sm">Отслеживайте свои достижения и участвуйте в конкурсах</p>
          </div>
          <div className="p-6">
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">P</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Очки</p>
                    <p className="text-2xl font-bold text-gray-900">{gamiStats.points || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">A</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Достижения</p>
                    <p className="text-2xl font-bold text-gray-900">{gamiStats.achievementsCount || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">R</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Рейтинг</p>
                    <p className="text-2xl font-bold text-gray-900">{gamiStats.rank ? `#${gamiStats.rank}` : '#N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">L</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Уровень</p>
                    <p className="text-2xl font-bold text-gray-900">{gamiStats.level || 1}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Link href="/gamification/achievements" onClick={handleAchievementsClick} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Достижения</h3>
                  <p className="text-gray-600 text-sm">Просмотрите все ваши достижения</p>
                </div>
              </Link>
              <Link href="/gamification/leaderboard" className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Рейтинг</h3>
                  <p className="text-gray-600 text-sm">Посмотрите таблицу лидеров</p>
                </div>
              </Link>
              <Link href="/gamification/lottery" className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎲</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Лотерея</h3>
                  <p className="text-gray-600 text-sm">Участвуйте в розыгрышах призов</p>
                </div>
              </Link>
              <Link href="/gamification/prizes" className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎁</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Призы</h3>
                  <p className="text-gray-600 text-sm">Обменяйте очки на призы</p>
                </div>
              </Link>
            </div>

            {/* Recent Achievements */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Последние достижения</h2>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Первая продажа</h3>
                    <p className="text-gray-600">Добавьте свою первую продажу</p>
                    <p className="text-sm text-green-600 font-medium">+ очков</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Modal (Admin only) */}
        {showAchievementsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-gray-200 shadow-lg max-w-6xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Достижения</h3>
                <button
                  onClick={() => setShowAchievementsModal(false)}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg"
                >
                  Закрыть
                </button>
              </div>
              <div className="p-6">
                <div dangerouslySetInnerHTML={{ __html: achievementsHtml || '' }} />
              </div>
            </div>
          </div>
        )}

        {/* Payments Section (from 55.txt) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Платежи и баланс</h3>
            <p className="mt-1 text-gray-600 text-sm">Управляйте своими заработками и выводите средства</p>
          </div>
          <div className="p-6">
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Общий заработок */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Общий заработок</p>
                    <p className="text-2xl font-bold text-gray-900">5 ₽</p>
                  </div>
                </div>
              </div>

              {/* Доступно к выводу */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Доступно к выводу</p>
                    <p className="text-2xl font-bold text-gray-900">5 ₽</p>
                  </div>
                </div>
              </div>

              {/* Баллы */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Баллы</p>
                    <p className="text-2xl font-bold text-gray-900">5</p>
                  </div>
                </div>
              </div>

              {/* Выведено */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Выведено</p>
                    <p className="text-2xl font-bold text-gray-900">0 ₽</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <button className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Вывести средства
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Призы
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Обменять баллы
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Добавить продажу
              </button>
            </div>

            {/* Withdrawal Conditions */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Условия вывода средств</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Минимальная сумма</p>
                  <p className="text-lg font-semibold text-gray-900">100 ₽</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Максимальная сумма</p>
                  <p className="text-lg font-semibold text-gray-900">50000 ₽</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Комиссия</p>
                  <p className="text-lg font-semibold text-gray-900">0%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Время обработки</p>
                  <p className="text-lg font-semibold text-gray-900">1-3 дня</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600"><span className="font-medium">Способ выплаты:</span> Банковская карта</p>
              </div>
            </div>

            {/* Transactions History */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">История транзакций</h3>
                  <div className="mt-3 sm:mt-0 flex space-x-3">
                    <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
                      <option value="">Все типы</option>
                      <option value="withdrawal">Вывод</option>
                      <option value="earning">Заработок</option>
                      <option value="bonus">Бонус</option>
                      <option value="exchange">Обмен</option>
                    </select>
                    <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
                      <option value="">Все статусы</option>
                      <option value="completed">Завершено</option>
                      <option value="pending">В обработке</option>
                      <option value="failed">Отклонено</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Нет транзакций</h3>
                  <p className="mt-1 text-sm text-gray-500">Транзакции появятся здесь после совершения операций.</p>
                </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{resolveBrandName(sale.brand)}</td>
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

        {/* Add Sale Modal */}
        {isAddSaleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setIsAddSaleOpen(false)}></div>
            <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6" onClick={(e) => e.stopPropagation()}>
              <h1 className="text-2xl font-bold text-center mb-6">Добавить продажу</h1>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  // Валидация
                  if (!addSaleForm.productId) {
                    toast.error('Пожалуйста, выберите продукт');
                    return;
                  }
                  if (!addSaleForm.quantity || addSaleForm.quantity <= 0) {
                    toast.error('Пожалуйста, укажите количество порций');
                    return;
                  }
                  if (!addSaleFile) {
                    toast.error('Пожалуйста, загрузите файл подтверждения');
                    return;
                  }

                  setAddSaleLoading(true);
                  try {
                    const formDataToSend = new FormData();
                    formDataToSend.append('productId', addSaleForm.productId);
                    formDataToSend.append('quantity', String(addSaleForm.quantity));
                    formDataToSend.append('proofType', addSaleForm.proofType);
                    formDataToSend.append('receipt', addSaleFile);

                    const response = await fetch(`${API_BASE_URL}/api/sales`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      },
                      body: formDataToSend
                    });

                    if (response.ok) {
                      toast.success('Продажа успешно добавлена!');
                      // Очистить форму и закрыть модалку
                      setAddSaleForm({ productId: '', quantity: 1, proofType: 'receipt' });
                      setAddSaleFile(null);
                      setIsAddSaleOpen(false);
                      // Перенаправить на список продаж
                      router.push('/sales');
                    } else {
                      const errorData = await response.json().catch(() => ({}));
                      toast.error(errorData.message || 'Ошибка при добавлении продажи');
                    }
                  } catch (error) {
                    console.error('Ошибка отправки продажи:', error);
                    toast.error('Ошибка при отправке данных');
                  } finally {
                    setAddSaleLoading(false);
                  }
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Продукт *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    value={addSaleForm.productId}
                    onChange={(e) => setAddSaleForm((prev) => ({ ...prev, productId: e.target.value }))}
                  >
                    <option value="">Выберите продукт</option>
                    <option value="68dbb4711c18776ecf84f716">Test Product - 68dbb40fdee29e54c6880e01</option>
                    <option value="68dbb471e074fbba443a541d">Джин Gintl - 68dbb40fdee29e54c6880e01</option>
                    <option value="68dbb4719e512564eb0ad170">Джин Gintl Pink - 68dbb40fdee29e54c6880e01</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Количество *</label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    value={addSaleForm.quantity}
                    onChange={(e) => setAddSaleForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Тип подтверждения *</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="proofType"
                        className="mr-2"
                        value="receipt"
                        checked={addSaleForm.proofType === 'receipt'}
                        onChange={(e) => setAddSaleForm((prev) => ({ ...prev, proofType: e.target.value }))}
                      />
                      Чек
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="proofType"
                        className="mr-2"
                        value="photo"
                        checked={addSaleForm.proofType === 'photo'}
                        onChange={(e) => setAddSaleForm((prev) => ({ ...prev, proofType: e.target.value }))}
                      />
                      Фото
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Загрузить чек *</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    onChange={(e) => setAddSaleFile(e.target.files?.[0] || null)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={addSaleLoading}
                  className="inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed btn-primary focus:ring-blue-500 px-4 py-2 text-base rounded-lg w-full"
                >
                  {addSaleLoading ? 'Добавление...' : 'Добавить продажу'}
                </button>
                <button type="button" onClick={() => setIsAddSaleOpen(false)} className="inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed btn-secondary focus:ring-gray-500 px-4 py-2 text-base rounded-lg w-full">Закрыть</button>
              </form>
            </div>
          </div>
        )}

        {/* Admin Panel был перенесён наверх после приветствия, чтобы избежать дубля */}

        {/* Navigation Grid (hidden for admins) */}
        {!hasAdminAccess(user) && (
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

              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Dashboard;

export async function getServerSideProps() {
  const fs = require('fs');
  const path = require('path');
  try {
    // В прод-сборке Next.js рабочая директория — client/,
    // а файл 99.txt лежит уровнем выше (в корне проекта)
    const filePath = path.join(process.cwd(), '..', '99.txt');
    const achievementsHtml = fs.readFileSync(filePath, 'utf8');
    return { props: { achievementsHtml } };
  } catch (error) {
    console.error('Не удалось прочитать 99.txt для модального окна достижений:', error?.message || error);
    return { props: { achievementsHtml: '<div class="p-6 text-gray-600">Не удалось загрузить контент достижений</div>' } };
  }
}