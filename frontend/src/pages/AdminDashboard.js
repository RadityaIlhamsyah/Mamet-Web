import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Coffee, LogOut, Menu as MenuIcon, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusConfig = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  accepted: { label: 'Diterima', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  processing: { label: 'Sedang Diproses', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-800 border-green-300' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800 border-red-300' },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState({ total_orders: 0, total_revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchOrders();
    fetchAnalytics();
    fetchQRCode();

    // Connect to Socket.IO
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Admin connected to WebSocket');
      newSocket.emit('join_admin_room');
    });

    newSocket.on('new_order', (data) => {
      console.log('New order received:', data);
      fetchOrders();
      fetchAnalytics();
      toast.success('Pesanan baru masuk!');
    });

    newSocket.on('order_updated', (data) => {
      console.log('Order updated:', data);
      fetchOrders();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, getAuthHeaders());
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error('Gagal memuat pesanan');
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/daily`, getAuthHeaders());
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await axios.get(`${API}/qrcode`, getAuthHeaders());
      setQrCode(response.data.qr_code);
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(
        `${API}/orders/${orderId}/status`,
        { status: newStatus },
        getAuthHeaders()
      );
      toast.success('Status pesanan diperbarui');
      fetchOrders();
      fetchAnalytics();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Gagal memperbarui status pesanan');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    toast.success('Logout berhasil');
    navigate('/admin/login');
  };

  const activeOrders = orders.filter(
    (order) => ['pending', 'accepted', 'processing'].includes(order.status)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Coffee className="w-8 h-8 text-amber-700" />
              <div>
                <h1 className="text-2xl font-bold text-amber-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Warkop Mamet</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                data-testid="manage-menu-btn"
                onClick={() => navigate('/admin/menu')}
                variant="outline"
                className="border-amber-300 hover:bg-amber-50"
              >
                <MenuIcon className="w-4 h-4 mr-2" />
                Kelola Menu
              </Button>
              <Button
                data-testid="admin-logout-btn"
                onClick={handleLogout}
                variant="outline"
                className="border-red-300 hover:bg-red-50 text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Pesanan Hari Ini</p>
                  <p data-testid="total-orders-today" className="text-3xl font-bold text-amber-700">
                    {analytics.total_orders}
                  </p>
                </div>
                <div className="p-4 bg-amber-100 rounded-full">
                  <ShoppingBag className="w-8 h-8 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendapatan Hari Ini</p>
                  <p data-testid="total-revenue-today" className="text-3xl font-bold text-green-700">
                    Rp {analytics.total_revenue.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-4 bg-green-100 rounded-full">
                  <DollarSign className="w-8 h-8 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pesanan Aktif</p>
                  <p data-testid="active-orders-count" className="text-3xl font-bold text-blue-700">
                    {activeOrders.length}
                  </p>
                </div>
                <div className="p-4 bg-blue-100 rounded-full">
                  <TrendingUp className="w-8 h-8 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code */}
        {qrCode && (
          <Card className="mb-8 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b">
              <CardTitle className="text-amber-900">QR Code Menu</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">Scan QR code ini untuk akses menu</p>
              <img src={qrCode} alt="Menu QR Code" className="mx-auto w-48 h-48" />
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b">
            <CardTitle className="text-amber-900">Pesanan Real-time</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <p className="text-center text-gray-600 py-8">Memuat pesanan...</p>
            ) : orders.length === 0 ? (
              <p className="text-center text-gray-600 py-8">Belum ada pesanan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-amber-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Pelanggan</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Meja</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        data-testid={`admin-order-${order.id}`}
                        className="border-b border-gray-200 hover:bg-amber-50"
                      >
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm">{order.id.substring(0, 8)}</span>
                        </td>
                        <td className="py-4 px-4 font-medium">{order.customer_name}</td>
                        <td className="py-4 px-4">{order.table_number || '-'}</td>
                        <td className="py-4 px-4">
                          <div className="max-w-xs">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-sm text-gray-600">
                                {item.name} x{item.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-amber-700">
                          Rp {order.total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={`${statusConfig[order.status]?.color} border`}>
                            {statusConfig[order.status]?.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Select
                            data-testid={`status-select-${order.id}`}
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Menunggu</SelectItem>
                              <SelectItem value="accepted">Diterima</SelectItem>
                              <SelectItem value="processing">Diproses</SelectItem>
                              <SelectItem value="completed">Selesai</SelectItem>
                              <SelectItem value="cancelled">Dibatalkan</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
