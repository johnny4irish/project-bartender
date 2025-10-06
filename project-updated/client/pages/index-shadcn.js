import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/Button';
import { Trophy, Star, Users, TrendingUp, Gift, Zap, Target, Award } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    totalPrizes: 0,
    activeUsers: 0
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData(token);
    }
    fetchStats();
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`);
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const features = [
    {
      icon: Trophy,
      title: "Система наград",
      description: "Зарабатывайте баллы за активность и обменивайте их на призы"
    },
    {
      icon: Target,
      title: "Достижения",
      description: "Выполняйте задания и получайте уникальные достижения"
    },
    {
      icon: Users,
      title: "Сообщество",
      description: "Соревнуйтесь с друзьями и поднимайтесь в рейтинге"
    },
    {
      icon: Gift,
      title: "Призы",
      description: "Широкий выбор наград от партнеров платформы"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative bg-white rounded-full p-6 shadow-2xl">
                  <Zap className="h-16 w-16 text-blue-600" />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Bartender
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Мотивационная платформа нового поколения. Зарабатывайте баллы, получайте награды и достигайте новых высот вместе с нами.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => router.push('/dashboard')}
                >
                  <Trophy className="mr-2 h-5 w-5" />
                  Перейти в личный кабинет
                </Button>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => router.push('/auth/register')}
                  >
                    <Star className="mr-2 h-5 w-5" />
                    Начать путешествие
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg px-8 py-4 border-2 hover:bg-gray-50"
                    onClick={() => router.push('/auth/login')}
                  >
                    Войти в аккаунт
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                {stats.totalUsers?.toLocaleString() || 0}+
              </div>
              <div className="text-gray-600">Активных пользователей</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">
                {stats.totalPoints?.toLocaleString() || 0}+
              </div>
              <div className="text-gray-600">Баллов начислено</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">
                {stats.totalPrizes?.toLocaleString() || 0}+
              </div>
              <div className="text-gray-600">Призов выдано</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">
                {stats.activeUsers?.toLocaleString() || 0}+
              </div>
              <div className="text-gray-600">Онлайн сейчас</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Почему выбирают нас?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Современная платформа с инновационным подходом к мотивации и вознаграждениям
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={feature.title || `feature-${index}`} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm hover:bg-white">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl group-hover:from-blue-100 group-hover:to-purple-100 transition-colors">
                    <feature.icon className="h-8 w-8 text-blue-600 group-hover:text-purple-600 transition-colors" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Award className="h-16 w-16 text-white mx-auto mb-8" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Готовы начать?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к тысячам пользователей, которые уже зарабатывают баллы и получают награды каждый день.
          </p>
          {!user && (
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-50"
              onClick={() => router.push('/auth/register')}
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Зарегистрироваться бесплатно
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Zap className="h-8 w-8 text-blue-400 mr-2" />
              <span className="text-2xl font-bold">Bartender</span>
            </div>
            <p className="text-gray-400 mb-8">
              Мотивационная платформа для достижения ваших целей
            </p>
            <div className="border-t border-gray-800 pt-8">
              <p className="text-gray-500">
                © 2024 Bartender. Все права защищены.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}