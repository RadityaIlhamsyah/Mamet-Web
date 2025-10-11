import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Coffee, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('admin_token');
    if (token) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });

      localStorage.setItem('admin_token', response.data.token);
      localStorage.setItem('admin_username', response.data.username);
      toast.success('Login berhasil!');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login gagal. Periksa username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4 text-center bg-gradient-to-r from-amber-100 to-orange-100 border-b">
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-full shadow-md">
              <Coffee className="w-12 h-12 text-amber-700" />
            </div>
          </div>
          <CardTitle className="text-3xl text-amber-900">Warkop Mamet</CardTitle>
          <p className="text-base text-amber-700">Admin Dashboard</p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-base font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </Label>
              <Input id="username" data-testid="admin-username-input" type="text" placeholder="Masukkan username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 h-12" required />
            </div>

            <div>
              <Label htmlFor="password" className="text-base font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input id="password" data-testid="admin-password-input" type="password" placeholder="Masukkan password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12" required />
            </div>

            <Button data-testid="admin-login-btn" type="submit" className="w-full h-12 text-lg font-semibold bg-amber-600 hover:bg-amber-700" disabled={loading}>
              {loading ? 'Memproses...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800 text-center">
              <strong>Default credentials:</strong>
              <br />
              Username: admin | Password: admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
