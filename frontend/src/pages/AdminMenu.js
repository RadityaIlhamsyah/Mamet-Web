import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, Coffee } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminMenu = () => {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'food',
    price: '',
    image_url: '',
    description: '',
    available: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchMenuItems();
  }, [navigate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API}/menu/all`, getAuthHeaders());
      setMenuItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
      toast.error('Gagal memuat menu');
      setLoading(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price.toString(),
        image_url: item.image_url,
        description: item.description,
        available: item.available,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'food',
        price: '',
        image_url: '',
        description: '',
        available: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      price: parseFloat(formData.price),
    };

    try {
      if (editingItem) {
        await axios.put(`${API}/menu/${editingItem.id}`, data, getAuthHeaders());
        toast.success('Menu berhasil diperbarui');
      } else {
        await axios.post(`${API}/menu`, data, getAuthHeaders());
        toast.success('Menu berhasil ditambahkan');
      }
      fetchMenuItems();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Gagal menyimpan menu');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      return;
    }

    try {
      await axios.delete(`${API}/menu/${itemId}`, getAuthHeaders());
      toast.success('Menu berhasil dihapus');
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Gagal menghapus menu');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button data-testid="back-to-dashboard-btn" onClick={() => navigate('/admin/dashboard')} variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
              <div className="flex items-center gap-3">
                <Coffee className="w-8 h-8 text-amber-700" />
                <div>
                  <h1 className="text-2xl font-bold text-amber-900">Kelola Menu</h1>
                  <p className="text-sm text-gray-600">Tambah, edit, atau hapus item menu</p>
                </div>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-menu-item-btn" onClick={() => handleOpenDialog()} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Menu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Nama Menu</Label>
                    <Input id="name" data-testid="menu-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>

                  <div>
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger data-testid="menu-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Makanan</SelectItem>
                        <SelectItem value="drink">Minuman</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price">Harga (Rp)</Label>
                    <Input id="price" data-testid="menu-price-input" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                  </div>

                  <div>
                    <Label htmlFor="image_url">URL Gambar</Label>
                    <Input id="image_url" data-testid="menu-image-input" type="url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://example.com/image.jpg" required />
                  </div>

                  <div>
                    <Label htmlFor="description">Deskripsi</Label>
                    <Input id="description" data-testid="menu-description-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
                  </div>

                  <div className="flex items-center gap-2">
                    <input id="available" data-testid="menu-available-checkbox" type="checkbox" checked={formData.available} onChange={(e) => setFormData({ ...formData, available: e.target.checked })} className="w-4 h-4" />
                    <Label htmlFor="available" className="cursor-pointer">
                      Tersedia
                    </Label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                      Batal
                    </Button>
                    <Button data-testid="save-menu-item-btn" type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                      {editingItem ? 'Perbarui' : 'Tambah'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-600 py-8">Memuat menu...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Card key={item.id} data-testid={`admin-menu-item-${item.id}`} className="overflow-hidden shadow-lg">
                <div className="relative h-48 bg-gradient-to-br from-amber-100 to-orange-100">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  <Badge className={`absolute top-3 right-3 ${item.available ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'} border`}>{item.available ? 'Tersedia' : 'Tidak Tersedia'}</Badge>
                </div>
                <CardContent className="p-5">
                  <div className="mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{item.name}</h3>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 border text-xs">{item.category === 'food' ? 'Makanan' : 'Minuman'}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  <p className="text-2xl font-bold text-amber-700 mb-4">Rp {item.price.toLocaleString('id-ID')}</p>
                  <div className="flex gap-2">
                    <Button data-testid={`edit-menu-btn-${item.id}`} onClick={() => handleOpenDialog(item)} variant="outline" className="flex-1 border-amber-300 hover:bg-amber-50" size="sm">
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button data-testid={`delete-menu-btn-${item.id}`} onClick={() => handleDelete(item.id)} variant="outline" className="flex-1 border-red-300 hover:bg-red-50 text-red-600" size="sm">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMenu;
