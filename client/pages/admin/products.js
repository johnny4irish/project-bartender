import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import { authAPI, API_BASE_URL } from '../../utils/api';
import { resolveDisplayName } from '../../lib/utils'

const AdminProducts = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [brandMap, setBrandMap] = useState({});
  const [categoryMap, setCategoryMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'cocktail',
    pointsCalculationType: 'per_ruble',
    pointsPerRuble: 10/150,
    pointsPerPortion: 10,
    portionSizeGrams: 40,
    wholesalePrice: 0,
    packageVolume: 500,
    alcoholContent: 0,
    description: '',
    isActive: true,
    bottlePrice: 0,
    portionsPerBottle: 12
  });
  const [filters, setFilters] = useState({
    search: '',
    category: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const categories = [
    { value: 'cocktail', label: 'Коктейли' },
    { value: 'beer', label: 'Пиво' },
    { value: 'wine', label: 'Вино' },
    { value: 'spirits', label: 'Крепкие напитки' },
    { value: 'non-alcoholic', label: 'Безалкогольные' },
    { value: 'other', label: 'Другое' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchCurrentUser();
    fetchProducts();
  }, [router, filters, pagination.current]);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/data/brands`);
        if (res.ok) {
          const brands = await res.json();
          const map = {};
          (brands || []).forEach(b => {
            if (b && (b._id || b.id)) {
              map[b._id || b.id] = b.displayName || b.name || 'Без имени';
            }
          });
          setBrandMap(map);
        }
      } catch (error) {
        console.error('Ошибка загрузки брендов:', error);
      }
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/admin/categories`, {
          headers: {
            'x-auth-token': token
          }
        });
        if (res.ok) {
          const categories = await res.json();
          const map = {};
          (categories || []).forEach(c => {
            if (c && (c._id || c.id)) {
              map[c._id || c.id] = c.displayName || c.name || 'Без категории';
            }
          });
          setCategoryMap(map);
        }
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
      }
    };
    fetchCategories();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const userData = await authAPI.me();
      setUser(userData);
    } catch (error) {
      console.error('Ошибка при получении данных пользователя:', error);
      router.push('/login');
    } finally {
      setIsLoading(false); // Устанавливаем isLoading в false после загрузки пользователя
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: pagination.current,
        limit: 20,
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category })
      });

      const response = await fetch(`${API_BASE_URL}/api/admin/products?${queryParams}`, {
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setPagination(data.pagination);
      } else {
        setError('Ошибка при загрузке продуктов');
      }
    } catch (error) {
      console.error('Ошибка при загрузке продуктов:', error);
      setError('Ошибка при загрузке продуктов');
    }
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        fetchProducts(); // Обновляем список продуктов
      } else {
        setError('Ошибка при изменении статуса продукта');
      }
    } catch (error) {
      console.error('Ошибка при изменении статуса продукта:', error);
      setError('Ошибка при изменении статуса продукта');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('=== НАЧАЛО ОТПРАВКИ ФОРМЫ ===');
    console.log('Form data:', formData);
    console.log('Editing product:', editingProduct);
    console.log('Is creating new product:', !editingProduct);
    
    // Проверяем все обязательные поля
    console.log('Required fields check:');
    console.log('- name:', formData.name);
    console.log('- brand:', formData.brand);
    console.log('- category:', formData.category);
    console.log('- bottlePrice:', formData.bottlePrice);
    console.log('- portionsPerBottle:', formData.portionsPerBottle);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      const url = editingProduct 
        ? `${API_BASE_URL}/api/admin/products/${editingProduct._id}`
        : `${API_BASE_URL}/api/admin/products`;
      
      const method = editingProduct ? 'PUT' : 'POST';
      console.log('Request URL:', url);
      console.log('Request method:', method);

      const requestBody = JSON.stringify(formData);
      console.log('Request body:', requestBody);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: requestBody
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result);
        setShowModal(false);
        setEditingProduct(null);
        setFormData({
          name: '',
          brand: '',
          category: 'cocktail',
          pointsCalculationType: 'per_ruble',
          pointsPerRuble: 10/150,
          pointsPerPortion: 10,
          portionSizeGrams: 40,
          wholesalePrice: 0,
          packageVolume: 500,
          alcoholContent: 0,
          description: '',
          isActive: true,
          bottlePrice: 0,
          portionsPerBottle: 12
        });
        fetchProducts();
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError(errorData.msg || 'Ошибка при сохранении продукта');
      }
    } catch (error) {
      console.error('Ошибка при сохранении продукта:', error);
      setError('Ошибка при сохранении продукта');
    }
    console.log('=== КОНЕЦ ОТПРАВКИ ФОРМЫ ===');
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      category: product.category,
      pointsCalculationType: product.pointsCalculationType || 'per_ruble',
      pointsPerRuble: product.pointsPerRuble,
      pointsPerPortion: product.pointsPerPortion || 10,
      portionSizeGrams: product.portionSizeGrams || 40,
      wholesalePrice: product.wholesalePrice || 0,
      packageVolume: product.packageVolume || 500,
      alcoholContent: product.alcoholContent || 0,
      description: product.description || '',
      isActive: product.isActive !== undefined ? product.isActive : true,
      bottlePrice: product.bottlePrice || 0,
      portionsPerBottle: product.portionsPerBottle || 12
    });
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (!confirm('Вы уверены, что хотите удалить этот продукт?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchProducts();
      } else {
        setError('Ошибка при удалении продукта');
      }
    } catch (error) {
      console.error('Ошибка при удалении продукта:', error);
      setError('Ошибка при удалении продукта');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Универсальные резолверы отображаемых значений
  const resolveBrandName = (brand) => resolveDisplayName(brand, brandMap)
  const resolveCategoryName = (category) => {
    const mapped = resolveDisplayName(category, categoryMap)
    if (mapped && mapped !== category) return mapped
    const local = categories.find(cat => cat.value === category)?.label
    return local || mapped
  }

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'brand_representative': return 'Представитель бренда';
      case 'bar_manager': return 'Менеджер бара';
      case 'test_bartender': return 'Тест-бармен';
      default: return role;
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Показываем загрузку пока данные пользователя не загружены
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 text-sm">
                ← Админ-панель
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Управление продуктами</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-gray-900 font-medium">Привет, {user.name}!</p>
                <p className="text-gray-600 text-sm">
                  {(() => {
                    const roleMap = {
                      'admin': 'Администратор',
                      'brand_representative': 'Представитель бренда',
                      'bar_manager': 'Менеджер бара',
                      'test_bartender': 'Тест-бармен',
                      'bartender': 'Бармен'
                    };
                    return roleMap[user.role?.name] || user.role?.name || 'Пользователь';
                  })()}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Поиск по названию или бренду
              </label>
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Введите название или бренд..."
              />
            </div>
            <div className="flex-1">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Категория
              </label>
              <select
                id="category"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все категории</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto"
              >
                Добавить продукт
              </Button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Продукты ({pagination.total})
            </h2>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Продукт
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Система баллов
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип расчета
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{resolveBrandName(product.brand)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {resolveCategoryName(product.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.pointsCalculationType === 'per_ruble' && (
                          <div>
                            <div className="font-medium">{product.pointsPerRuble.toFixed(4)} за рубль</div>
                          </div>
                        )}
                        {product.pointsCalculationType === 'per_portion' && (
                          <div>
                            <div className="font-medium">{product.pointsPerPortion} за порцию</div>
                            <div className="text-xs text-gray-500">Размер порции: {product.portionSizeGrams}г</div>
                          </div>
                        )}
                        {product.pointsCalculationType === 'per_volume' && (
                          <div>
                            <div className="font-medium">{product.pointsPerRuble.toFixed(4)} за мл</div>
                          </div>
                        )}
                        {!product.pointsCalculationType && (
                          <div>
                            <div className="font-medium">{product.pointsPerRuble.toFixed(4)} за рубль</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {product.pointsCalculationType === 'per_ruble' && 'За рубль'}
                        {product.pointsCalculationType === 'per_portion' && 'За порцию'}
                        {product.pointsCalculationType === 'per_volume' && 'За объем'}
                        {!product.pointsCalculationType && 'За рубль'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (product.isActive !== false) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(product.isActive !== false) ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleToggleStatus(product._id, product.isActive)}
                        className={`mr-4 ${
                          (product.isActive !== false) 
                            ? 'text-orange-600 hover:text-orange-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {(product.isActive !== false) ? 'Деактивировать' : 'Активировать'}
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            {products.map((product) => (
              <div key={product._id} className="p-6 border-b border-gray-200 last:border-b-0">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600">{resolveBrandName(product.brand)}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {resolveCategoryName(product.category)}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    (product.isActive !== false) 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(product.isActive !== false) ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Система баллов:</span>
                    {product.pointsCalculationType === 'per_ruble' && ` ${product.pointsPerRuble.toFixed(4)} за рубль`}
                    {product.pointsCalculationType === 'per_portion' && ` ${product.pointsPerPortion} за порцию (${product.portionSizeGrams}г)`}
                    {product.pointsCalculationType === 'per_volume' && ` ${product.pointsPerRuble.toFixed(4)} за мл`}
                    {!product.pointsCalculationType && ` ${product.pointsPerRuble.toFixed(4)} за рубль`}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleToggleStatus(product._id, product.isActive)}
                    className={`text-sm font-medium ${
                      (product.isActive !== false) 
                        ? 'text-orange-600 hover:text-orange-900' 
                        : 'text-green-600 hover:text-green-900'
                    }`}
                  >
                    {(product.isActive !== false) ? 'Деактивировать' : 'Активировать'}
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setPagination({ ...pagination, current: page })}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    page === pagination.current
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 mx-auto p-5 border max-w-2xl w-full shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Редактировать продукт' : 'Добавить продукт'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Название</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Бренд</label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Категория</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Тип расчета баллов</label>
                    <select
                      value={formData.pointsCalculationType}
                      onChange={(e) => setFormData({ ...formData, pointsCalculationType: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="per_ruble">За рубль</option>
                      <option value="per_portion">За порцию</option>
                      <option value="per_volume">За объем</option>
                    </select>
                  </div>
                </div>

                {formData.pointsCalculationType === 'per_ruble' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Баллов за рубль</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      required
                      value={formData.pointsPerRuble}
                      onChange={(e) => setFormData({ ...formData, pointsPerRuble: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      По умолчанию: {(10/150).toFixed(4)} (10 баллов за 150 рублей)
                    </p>
                  </div>
                )}

                {formData.pointsCalculationType === 'per_portion' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Баллов за порцию</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.pointsPerPortion}
                          onChange={(e) => setFormData({ ...formData, pointsPerPortion: parseInt(e.target.value) || 0 })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Размер порции (грамм)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.portionSizeGrams}
                          onChange={(e) => setFormData({ ...formData, portionSizeGrams: parseInt(e.target.value) || 0 })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Цена за бутылку (₽)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={formData.bottlePrice}
                          onChange={(e) => setFormData({ ...formData, bottlePrice: parseFloat(e.target.value) || 0 })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Порций в бутылке</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          required
                          value={formData.portionsPerBottle}
                          onChange={(e) => setFormData({ ...formData, portionsPerBottle: parseFloat(e.target.value) || 12 })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Отгрузочная цена (₽)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={formData.wholesalePrice}
                          onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Объем упаковки (мл)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.packageVolume}
                          onChange={(e) => setFormData({ ...formData, packageVolume: parseInt(e.target.value) || 0 })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Содержание алкоголя (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.alcoholContent}
                        onChange={(e) => setFormData({ ...formData, alcoholContent: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                {formData.pointsCalculationType === 'per_volume' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Баллов за рубль</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      required
                      value={formData.pointsPerRuble}
                      onChange={(e) => setFormData({ ...formData, pointsPerRuble: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Функциональность в разработке
                    </p>
                  </div>
                )}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Активен
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Описание</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProduct(null);
                      setFormData({
                        name: '',
                        brand: '',
                        category: 'cocktail',
                        pointsCalculationType: 'per_ruble',
                        pointsPerRuble: 10/150,
                        pointsPerPortion: 10,
                        portionSizeGrams: 40,
                        wholesalePrice: 0,
                        packageVolume: 500,
                        alcoholContent: 0,
                        description: '',
                        isActive: true,
                        bottlePrice: 0,
                        portionsPerBottle: 12
                      });
                    }}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    {editingProduct ? 'Сохранить' : 'Создать'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;