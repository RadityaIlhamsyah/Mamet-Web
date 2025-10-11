// OrderStatusPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CheckCircle, Clock, Loader, ChefHat, Home } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusConfig = {
  pending: {
    label: 'Menunggu',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
  },
  accepted: {
    label: 'Diterima',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: CheckCircle,
  },
  processing: {
    label: 'Sedang Diproses',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: ChefHat,
  },
  completed: {
    label: 'Selesai',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Dibatalkan',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: Clock,
  },
};

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchOrder();

    // Connect to Socket.IO
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      newSocket.emit('join_order_room', { order_id: orderId });
    });

    newSocket.on('order_status_updated', (data) => {
      console.log('Order status updated:', data);
      if (data.order_id === orderId) {
        setOrder((prevOrder) => ({
          ...prevOrder,
          status: data.status,
          updated_at: data.updated_at,
        }));
        toast.success(`Status pesanan diperbarui: ${statusConfig[data.status]?.label}`);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`);
      setOrder(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Gagal memuat pesanan');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <Loader className="w-16 h-16 mx-auto mb-4 text-amber-700 animate-spin" />
          <p className="text-lg text-gray-600">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-lg text-gray-600 mb-4">Pesanan tidak ditemukan</p>
            <Button onClick={() => navigate('/')}>Kembali ke Menu</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusConfig[order.status]?.icon || Clock;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Button data-testid="back-to-home-btn" onClick={() => navigate('/')} variant="ghost" className="mb-6">
          <Home className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Button>

        {/* Status Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-full shadow-md">
                <StatusIcon className="w-12 h-12 text-amber-700" />
              </div>
            </div>
            <CardTitle className="text-2xl text-amber-900">Status Pesanan</CardTitle>
            <Badge data-testid="order-status-badge" className={`${statusConfig[order.status]?.color} text-lg px-4 py-2 mt-3 border-2`}>
              {statusConfig[order.status]?.label}
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 text-center mb-6">
              <p className="text-sm text-gray-600">
                ID Pesanan: <span className="font-mono font-semibold">{order.id}</span>
              </p>
              <p className="text-base">
                <span className="font-semibold">Nama:</span> {order.customer_name}
              </p>
              {order.table_number && (
                <p className="text-base">
                  <span className="font-semibold">Meja:</span> {order.table_number}
                </p>
              )}
            </div>

            {/* Progress Steps */}
            <div className="flex justify-between items-center mb-8 px-4">
              {['pending', 'accepted', 'processing', 'completed'].map((status, index) => {
                const isActive = ['pending', 'accepted', 'processing', 'completed'].indexOf(order.status) >= index;
                const Icon = statusConfig[status].icon;
                return (
                  <div key={status} className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-amber-600 border-amber-600 text-white' : 'bg-gray-200 border-gray-300 text-gray-400'} transition-all duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <p className={`text-xs mt-2 text-center ${isActive ? 'text-amber-900 font-semibold' : 'text-gray-500'}`}>{statusConfig[status].label}</p>
                    {index < 3 && (
                      <div
                        className={`absolute h-0.5 w-full top-6 left-1/2 -z-10 ${['pending', 'accepted', 'processing', 'completed'].indexOf(order.status) > index ? 'bg-amber-600' : 'bg-gray-300'}`}
                        style={{ width: 'calc(100% - 3rem)' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b">
            <CardTitle className="text-amber-900">Detail Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} data-testid={`order-item-${index}`} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <p className="font-bold text-amber-700">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                </div>
              ))}
              <div className="border-t-2 border-amber-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span data-testid="order-total" className="text-2xl font-bold text-amber-700">
                    Rp {order.total.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderStatusPage;
