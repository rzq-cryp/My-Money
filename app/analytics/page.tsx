'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../Lib/Supabase';
import BottomNav from '@/components/BottomNav';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function AnalyticsPage() {
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    // Mengambil data langsung dari View SQL yang sudah dibuat
    const { data } = await supabase.from('monthly_category_expenses').select('*');
    if (data) {
      const formatted = data.map((item: any) => ({
        name: item.category_name,
        value: Number(item.total_amount),
      }));
      setCategoryData(formatted);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24 min-h-screen bg-gray-50">
      <h1 className="text-xl font-bold mb-4 text-gray-800">Analitik Keuangan</h1>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Pengeluaran per Kategori</h2>
        {categoryData.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-12">Belum ada data pengeluaran</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}