'use client';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function withAuth(Component) {
  return function Wrapped(props) {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [loading, user, router]);

    if (loading) return null;
    return <Component {...props} />;
  };
}