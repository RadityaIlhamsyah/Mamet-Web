import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ShoppingCart, Plus, Minus, Coffee } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMenu();
    loadCart();
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu`);
      setMenuItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Gagal memuat menu');
      setLoading(false);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart) => {
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
  };

  const addToCart = (item) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id);
    if (existingItem) {
      const updatedCart = cart.map((cartItem) => (cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem));
      saveCart(updatedCart);
    } else {
      saveCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success(`${item.name} ditambahkan ke keranjang`);
  };

  const updateQuantity = (itemId, change) => {
    const updatedCart = cart.map((item) => (item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + change) } : item)).filter((item) => item.quantity > 0);
    saveCart(updatedCart);
  };

  const getCartQuantity = (itemId) => {
    const item = cart.find((cartItem) => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const filteredItems = filter === 'all' ? menuItems : menuItems.filter((item) => item.category === filter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-16 h-16 mx-auto mb-4 text-amber-700 animate-pulse" />
          <p className="text-lg text-gray-600">Memuat menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-amber-900 mb-2">Warkop Mamet</h1>
              <p className="text-base text-amber-700">Kopi dan Makanan Tradisional Terbaik</p>
            </div>
            <Coffee className="w-16 h-16 text-amber-700" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <Button data-testid="filter-all-btn" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} className="rounded-full">
              Semua
            </Button>
            <Button data-testid="filter-food-btn" variant={filter === 'food' ? 'default' : 'outline'} onClick={() => setFilter('food')} className="rounded-full">
              Makanan
            </Button>
            <Button data-testid="filter-drink-btn" variant={filter === 'drink' ? 'default' : 'outline'} onClick={() => setFilter('drink')} className="rounded-full">
              Minuman
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const quantity = getCartQuantity(item.id);
            return (
              <Card key={item.id} data-testid={`menu-item-${item.id}`} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-amber-200">
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                  <Badge className="absolute top-3 right-3 bg-white/90 text-amber-900 border border-amber-300">{item.category === 'food' ? 'Makanan' : 'Minuman'}</Badge>
                </div>
                <CardContent className="p-5">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-amber-700">Rp {item.price.toLocaleString('id-ID')}</span>
                    {quantity === 0 ? (
                      <Button data-testid={`add-to-cart-btn-${item.id}`} onClick={() => addToCart(item)} className="rounded-full bg-amber-600 hover:bg-amber-700" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Pesan
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button data-testid={`decrease-qty-btn-${item.id}`} onClick={() => updateQuantity(item.id, -1)} variant="outline" size="icon" className="h-8 w-8 rounded-full">
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-semibold text-lg w-8 text-center">{quantity}</span>
                        <Button data-testid={`increase-qty-btn-${item.id}`} onClick={() => updateQuantity(item.id, 1)} variant="outline" size="icon" className="h-8 w-8 rounded-full">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button data-testid="checkout-btn" onClick={() => navigate('/checkout')} className="h-16 rounded-full px-8 bg-amber-600 hover:bg-amber-700 shadow-2xl hover:shadow-3xl transition-all duration-300" size="lg">
            <ShoppingCart className="w-6 h-6 mr-3" />
            <span className="text-lg font-semibold">Lihat Keranjang ({getTotalItems()})</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
