import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { ArrowLeft, Trash2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CheckoutPage = () => {
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    } else {
      navigate('/');
    }
  };

  const removeItem = (itemId) => {
    const updatedCart = cart.filter((item) => item.id !== itemId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    toast.success('Item dihapus dari keranjang');
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Mohon masukkan nama Anda');
      return;
    }

    if (cart.length === 0) {
      toast.error('Keranjang Anda kosong');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        customer_name: customerName,
        table_number: tableNumber || null,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total: calculateTotal(),
      };

      const response = await axios.post(`${API}/orders`, orderData);

      localStorage.removeItem('cart');
      toast.success('Pesanan berhasil dibuat!');
      navigate(`/order/${response.data.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Gagal membuat pesanan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button data-testid="back-to-menu-btn" onClick={() => navigate('/')} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Menu
        </Button>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b">
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <ShoppingBag className="w-5 h-5" />
                Ringkasan Pesanan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Keranjang Anda kosong</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} data-testid={`cart-item-${item.id}`} className="flex justify-between items-start p-4 bg-amber-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                        </p>
                        <p className="text-base font-bold text-amber-700 mt-1">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                      </div>
                      <Button data-testid={`remove-item-btn-${item.id}`} onClick={() => removeItem(item.id)} variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-t-2 border-amber-200 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-amber-700">Rp {calculateTotal().toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b">
              <CardTitle className="text-amber-900">Informasi Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmitOrder} className="space-y-6">
                <div>
                  <Label htmlFor="customerName" className="text-base font-medium">
                    Nama <span className="text-red-500">*</span>
                  </Label>
                  <Input id="customerName" data-testid="customer-name-input" type="text" placeholder="Masukkan nama Anda" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-2 h-12" required />
                </div>

                <div>
                  <Label htmlFor="tableNumber" className="text-base font-medium">
                    Nomor Meja (Opsional)
                  </Label>
                  <Input id="tableNumber" data-testid="table-number-input" type="text" placeholder="Contoh: Meja 5" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="mt-2 h-12" />
                </div>

                <Button data-testid="submit-order-btn" type="submit" className="w-full h-12 text-lg font-semibold bg-amber-600 hover:bg-amber-700" disabled={loading || cart.length === 0}>
                  {loading ? 'Memproses...' : 'Kirim Pesanan'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
