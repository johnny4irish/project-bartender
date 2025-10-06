'use client';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function withRole(Component, allowedRoles = []) {
  return function Wrapped(props) {
    const router = useRouter();
    const { user, loading } = useAuth();

    const roleName = typeof user?.role === 'string' ? user?.role : user?.role?.name;

    useEffect(() => {
      if (!loading && !user) {
        router.push('/admin/login');
        return;
      }
      if (!loading && user && allowedRoles.length > 0 && !allowedRoles.includes(roleName)) {
        router.push('/');
      }
    }, [loading, user, roleName, router]);

    if (loading) return null;
    return <Component {...props} />;
  };
}