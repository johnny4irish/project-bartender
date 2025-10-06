export const revalidate = 3600;

async function getPublicStats() {
  try {
    // Используем относительный путь — Next.js middleware/rewrites направит запрос к бэкенду
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/stats`, {
      // Кешируем на стороне сервера для стабильной главной
      next: { revalidate: 3600 }
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return await res.json();
  } catch {
    return { totalUsers: 0, totalPoints: 0, totalPrizes: 0, activeUsers: 0 };
  }
}

export default async function Page() {
  const stats = await getPublicStats();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">🍸 Bartender Platform</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <a href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">Войти</a>
              <a href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">Регистрация</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Система лояльности для барменов
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Зарабатывайте баллы за продажи, участвуйте в конкурсах и получайте призы. 
            Современная платформа для мотивации и развития барменов.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
              Начать сейчас
            </a>
            <a href="/gamification" className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors">
              Узнать больше
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{stats.totalUsers}</h3>
              <p className="text-gray-600">Активных пользователей</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{stats.totalPoints}</h3>
              <p className="text-gray-600">Баллов заработано</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎁</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{stats.totalPrizes}</h3>
              <p className="text-gray-600">Призов доступно</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{stats.activeUsers}</h3>
              <p className="text-gray-600">Активных сегодня</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Возможности платформы</h2>
            <p className="text-xl text-gray-600">Все что нужно для эффективной работы</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Система баллов</h3>
              <p className="text-gray-600">Зарабатывайте баллы за каждую продажу и достигайте новых уровней</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Конкурсы</h3>
              <p className="text-gray-600">Участвуйте в еженедельных и ежемесячных конкурсах</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">🎁</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Призы</h3>
              <p className="text-gray-600">Обменивайте баллы на ценные призы и бонусы</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">🍸 Bartender Platform</h3>
            <p className="text-gray-400 mb-8">Система лояльности нового поколения</p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">О нас</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Поддержка</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Контакты</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}