import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import { authAPI, adminAPI } from '../../utils/api';

const AdminPrizes = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPrize, setEditingPrize] = useState(null);
  const [newPrize, setNewPrize] = useState({
    name: '',
    description: '',
    pointsCost: '',
    quantity: '',
    category: 'merchandise',
    isActive: true
  });

  // Категории призов
  const prizeCategories = [
    { value: 'merchandise', label: 'Товары' },
    { value: 'discount', label: 'Скидки' },
    { value: 'experience', label: 'Впечатления' },
    { value: 'cash', label: 'Денежные призы' },
    { value: 'other', label: 'Другое' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetchCurrentUser();
    fetchPrizes();
  }, [router]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Ошибка при получении данных пользователя:', error);
      router.push('/admin/login');
    }
  };

  const fetchPrizes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/prizes', {
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPrizes(data);
      } else {
        setError('Ошибка при загрузке призов');
      }
    } catch (error) {
      console.error('Ошибка при получении призов:', error);
      setError('Ошибка при загрузке призов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleAddPrize = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/prizes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newPrize,
          cost: parseInt(newPrize.pointsCost),
          quantity: parseInt(newPrize.quantity)
        })
      });

      if (response.ok) {
        const addedPrize = await response.json();
        setPrizes([...prizes, addedPrize]);
        setShowAddModal(false);
        setNewPrize({
          name: '',
          description: '',
          pointsCost: '',
          quantity: '',
          category: 'merchandise',
          isActive: true
        });
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка при добавлении приза');
      }
    } catch (error) {
      console.error('Ошибка при добавлении приза:', error);
      setError('Ошибка при добавлении приза');
    }
  };

  const handleEditPrize = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/prizes/${editingPrize._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editingPrize,
          pointsRequired: parseInt(editingPrize.pointsRequired)
        })
      });

      if (response.ok) {
        const updatedPrize = await response.json();
        setPrizes(prizes.map(prize => 
          prize._id === updatedPrize._id ? updatedPrize : prize
        ));
        setEditingPrize(null);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка при обновлении приза');
      }
    } catch (error) {
      console.error('Ошибка при обновлении приза:', error);
      setError('Ошибка при обновлении приза');
    }
  };

  const handleDeletePrize = async (prizeId) => {
    if (!confirm('Вы уверены, что хотите удалить этот приз?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/prizes/${prizeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setPrizes(prizes.filter(prize => prize._id !== prizeId));
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка при удалении приза');
      }
    } catch (error) {
      console.error('Ошибка при удалении приза:', error);
      setError('Ошибка при удалении приза');
    }
  };

  const togglePrizeStatus = async (prizeId) => {
    const prize = prizes.find(p => p._id === prizeId);
    if (!prize) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/prizes/${prizeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...prize,
          isActive: !prize.isActive
        })
      });

      if (response.ok) {
        const updatedPrize = await response.json();
        setPrizes(prizes.map(p => 
          p._id === prizeId ? updatedPrize : p
        ));
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка при изменении статуса приза');
      }
    } catch (error) {
      console.error('Ошибка при изменении статуса приза:', error);
      setError('Ошибка при изменении статуса приза');
    }
  };

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
          <p className="text-gray-600 mb-4">У вас нет прав для доступа к этой странице</p>
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
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 text-sm">
                ← Админ-панель
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Управление призами</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-gray-900 font-medium">Привет, {user.name}!</p>
                <p className="text-gray-600 text-sm">
                  {user.role === 'admin' ? 'Администратор' : 'Представитель бренда'}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Add Prize Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Список призов</h2>
          <Button onClick={() => setShowAddModal(true)}>
            Добавить приз
          </Button>
        </div>

        {/* Prizes List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-6 text-gray-900 font-medium">Название</th>
                  <th className="text-left py-4 px-6 text-gray-900 font-medium">Описание</th>
                  <th className="text-left py-4 px-6 text-gray-900 font-medium">Стоимость</th>
                  <th className="text-left py-4 px-6 text-gray-900 font-medium">Категория</th>
                  <th className="text-left py-4 px-6 text-gray-900 font-medium">Статус</th>
                  <th className="text-right py-4 px-6 text-gray-900 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {prizes.length > 0 ? (
                  prizes.map((prize) => (
                    <tr key={prize._id}>
                      <td className="py-4 px-6 text-gray-900 font-medium">{prize.name}</td>
                      <td className="py-4 px-6 text-gray-600">{prize.description}</td>
                      <td className="py-4 px-6 text-gray-900">{prize.cost} баллов</td>
                      <td className="py-4 px-6 text-gray-600">
                        {prizeCategories.find(cat => cat.value === prize.category)?.label || prize.category}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          prize.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {prize.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingPrize(prize)}
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant={prize.isActive ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => togglePrizeStatus(prize._id)}
                        >
                          {prize.isActive ? 'Деактивировать' : 'Активировать'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeletePrize(prize._id)}
                        >
                          Удалить
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-600">
                      Нет призов для отображения
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Add Prize Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Добавить новый приз</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название приза
                </label>
                <input
                  type="text"
                  value={newPrize.name}
                  onChange={(e) => setNewPrize({...newPrize, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите название приза"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={newPrize.description}
                  onChange={(e) => setNewPrize({...newPrize, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Введите описание приза"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Необходимо баллов
                </label>
                <input
                  type="number"
                  value={newPrize.pointsCost}
                  onChange={(e) => setNewPrize({...newPrize, pointsCost: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите количество баллов"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Категория
                </label>
                <select
                  value={newPrize.category}
                  onChange={(e) => setNewPrize({...newPrize, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {prizeCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Количество
                </label>
                <input
                  type="number"
                  value={newPrize.quantity}
                  onChange={(e) => setNewPrize({...newPrize, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите количество призов"
                  min="0"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newPrize.isActive}
                  onChange={(e) => setNewPrize({...newPrize, isActive: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Активен
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewPrize({
                    name: '',
                    description: '',
                    pointsCost: '',
                    quantity: '',
                    category: 'merchandise',
                    isActive: true
                  });
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleAddPrize}>
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Prize Modal */}
      {editingPrize && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Редактировать приз</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название приза
                </label>
                <input
                  type="text"
                  value={editingPrize.name}
                  onChange={(e) => setEditingPrize({...editingPrize, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={editingPrize.description}
                  onChange={(e) => setEditingPrize({...editingPrize, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Необходимо баллов
                </label>
                <input
                  type="number"
                  value={editingPrize.pointsCost}
                  onChange={(e) => setEditingPrize({...editingPrize, pointsCost: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editingPrize.isActive}
                  onChange={(e) => setEditingPrize({...editingPrize, isActive: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="editIsActive" className="text-sm text-gray-700">
                  Активен
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setEditingPrize(null)}
              >
                Отмена
              </Button>
              <Button onClick={handleEditPrize}>
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPrizes;