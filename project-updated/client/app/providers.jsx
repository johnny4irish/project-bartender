'use client';

import { AuthProvider } from '../context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
      <ToastContainer position="top-right" autoClose={5000} />
    </AuthProvider>
  );
}