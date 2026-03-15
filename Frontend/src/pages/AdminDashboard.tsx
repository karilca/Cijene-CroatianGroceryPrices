import React, { useEffect, useState } from 'react';
import { User, Trash2, Edit3, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Putanja do tvog supabase klijenta

// --- INTERFACES ---
interface Role {
  id: number;
  name: string;
}

interface UserData {
  id: number;
  name: string;
  is_active: boolean;
  role_id: number;
  role_name: string;
  supabase_uid: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Koristimo tvoj provjereni način dohvata sesije
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Authorization': `Bearer ${session?.access_token}` };

      // Port 8080 jer tamo tvoj backend sluša
      const [uRes, rRes] = await Promise.all([
        fetch('http://localhost:8080/v1/admin/users', { headers }),
        fetch('http://localhost:8080/v1/admin/roles', { headers })
      ]);

      if (uRes.ok && rRes.ok) {
        setUsers(await uRes.json());
        setRoles(await rRes.json());
      }
    } catch (err) {
      console.error("Greška pri dohvaćanju podataka:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`http://localhost:8080/v1/admin/users/${editingUser.supabase_uid}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          is_active: editingUser.is_active,
          role_id: editingUser.role_id
        })
      });

      if (res.ok) {
        setEditingUser(null);
        fetchData();
      }
    } catch (err) { 
      alert("Neuspjelo ažuriranje"); 
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm("Jeste li sigurni da želite obrisati ovog korisnika?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`http://localhost:8080/v1/admin/users/${uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert("Greška pri brisanju");
    }
  };

  if (loading) return <div className="flex justify-center p-20 text-gray-400">Učitavanje postavki...</div>;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      {/* Breadcrumbs */}
      <div className="max-w-6xl mx-auto px-4 py-4 text-sm text-gray-500 flex items-center gap-2">
        <span>Početna</span> <ChevronRight size={14} /> <span className="text-red-600 font-medium">Admin Panel</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upravljanje korisnicima</h1>
            <p className="text-gray-500 text-sm mt-1">Pregled i uređivanje ovlasti članova</p>
          </div>
          <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
            {users.length} Korisnika
          </div>
        </div>

        {/* Tablica korisnika */}
        <div className="grid grid-cols-1 gap-4">
          {users.map((user) => (
            <div key={user.supabase_uid} className="border border-gray-100 rounded-lg p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                    <User size={20} className="text-gray-400" />
                  </div>
                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{user.name}</h3>
                  <p className="text-xs text-gray-400 font-mono uppercase tracking-tighter">UID: {user.supabase_uid.slice(0, 12)}...</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-widest">Uloga</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${user.role_name === 'ADMIN' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {user.role_name}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingUser(user)}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-red-600 hover:text-red-600 transition-colors"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(user.supabase_uid)}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal za uređivanje */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-1">Uredi ovlasti</h2>
              <p className="text-sm text-gray-500 mb-6">{editingUser.name}</p>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2 tracking-widest">Status računa</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingUser({...editingUser, is_active: true})}
                      className={`flex-1 py-2 rounded-md border text-sm font-bold transition-all ${editingUser.is_active ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}
                    >
                      Aktivan
                    </button>
                    <button 
                      onClick={() => setEditingUser({...editingUser, is_active: false})}
                      className={`flex-1 py-2 rounded-md border text-sm font-bold transition-all ${!editingUser.is_active ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}
                    >
                      Blokiran
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2 tracking-widest">Dodijeljena uloga</label>
                  <select 
                    value={editingUser.role_id}
                    onChange={(e) => setEditingUser({...editingUser, role_id: parseInt(e.target.value)})}
                    className="w-full border border-gray-200 rounded-md p-2 text-sm focus:border-red-600 outline-none transition-colors"
                  >
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex gap-2">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-800">Odustani</button>
              <button 
                onClick={handleUpdate}
                className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-md hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
              >
                Spremi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;