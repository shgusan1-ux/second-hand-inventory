import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { saveLifecycleSettings, getLifecycleSettings } from '@/lib/actions';
import { useArchiveSettings, type ArchiveCategory } from '@/hooks/use-archive-settings';

interface CustomBrand {
  id: number;
  brand_name: string;
  brand_name_ko: string;
  tier: string;
  aliases: string;
  country: string;
  notes: string;
  is_active: boolean;
}

interface SettingsTabProps {
  onRefresh: () => void;
}

// 라이프사이클 기본 설정값
const DEFAULT_LIFECYCLE = {
  newDays: 30,
  curatedDays: 60,
  archiveDays: 120,
  curatedDiscount: 20,
  archiveDiscount: 20,
  clearanceDiscount: 20,
};

export function SettingsTab({ onRefresh }: SettingsTabProps) {
  const [section, setSection] = useState<'archive' | 'lifecycle'>('archive');
  const { categories: archiveCategories, updateCategory, loading: categoriesLoading } = useArchiveSettings();

  const TIERS = useMemo(() => [
    ...archiveCategories.map(c => c.category_id),
    'OTHER'
  ], [archiveCategories]);

  const TIER_LABELS = useMemo(() => {
    const map: Record<string, string> = { OTHER: '기타 (OTHER)' };
    archiveCategories.forEach(c => {
      map[c.category_id] = c.display_name;
    });
    return map;
  }, [archiveCategories]);

  // 카테고리 이름 수정을 위한 로컬 상태
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // 라이프사이클 설정
  const [lifecycle, setLifecycle] = useState({ ...DEFAULT_LIFECYCLE });

  // 브랜드 마스터
  const [brands, setBrands] = useState<CustomBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [newBrand, setNewBrand] = useState({ brand_name: '', brand_name_ko: '', tier: 'OTHER', aliases: '', country: '', notes: '' });
  const [showAddBrand, setShowAddBrand] = useState(false);

  // 브랜드 마스터 로드
  const loadBrands = async () => {
    setBrandsLoading(true);
    try {
      const res = await fetch('/api/smartstore/brands');
      const data = await res.json();
      if (data.success) {
        setBrands(data.brands || []);
      }
    } catch (e) {
      console.error('브랜드 로드 실패:', e);
    }
    setBrandsLoading(false);
  };

  useEffect(() => {
    if (section === 'archive') loadBrands();
    if (section === 'lifecycle') loadLifecycleSettings();
  }, [section]);

  const loadLifecycleSettings = async () => {
    try {
      const settings = await getLifecycleSettings();
      if (settings) {
        setLifecycle(settings);
      }
    } catch (e) {
      console.error("Failed to load lifecycle settings", e);
    }
  };

  const handleSaveLifecycle = async () => {
    try {
      const res = await saveLifecycleSettings(lifecycle);
      if (res.success) {
        toast.success('라이프사이클 설정이 저장되었습니다.');
      } else {
        toast.error(res.error || '저장 실패');
      }
    } catch (e) {
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  // 브랜드 추가
  const handleAddBrand = async () => {
    if (!newBrand.brand_name.trim()) {
      toast.error('브랜드명을 입력해주세요');
      return;
    }
    try {
      const res = await fetch('/api/smartstore/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBrand),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('브랜드 추가 완료');
        setNewBrand({ brand_name: '', brand_name_ko: '', tier: 'OTHER', aliases: '', country: '', notes: '' });
        setShowAddBrand(false);
        loadBrands();
      } else {
        toast.error(data.error || '추가 실패');
      }
    } catch (e: any) {
      toast.error('오류: ' + e.message);
    }
  };

  // 브랜드 삭제
  const handleDeleteBrand = async (id: number) => {
    if (!confirm('이 브랜드를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/smartstore/brands?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('브랜드 삭제 완료');
        loadBrands();
      } else {
        toast.error(data.error || '삭제 실패');
      }
    } catch (e: any) {
      toast.error('오류: ' + e.message);
    }
  };

  const sectionButtons = [
    { id: 'archive' as const, label: '아카이브 분류', icon: '📦' },
    { id: 'lifecycle' as const, label: '라이프사이클', icon: '⏳' },
  ];

  return (
    <div className="space-y-4">
      {/* 섹션 선택 */}
      <div className="grid grid-cols-4 gap-1.5">
        {sectionButtons.map(btn => (
          <button
            key={btn.id}
            onClick={() => setSection(btn.id)}
            className={`py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 border ${section === btn.id
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            <span className="block text-sm mb-0.5">{btn.icon}</span>
            {btn.label}
          </button>
        ))}
      </div>


      {/* 아카이브 분류 설정 (통합 인터페이스) */}
      {section === 'archive' && (
        <div className="space-y-3">
          {/* 아카이브 카테고리 목록 및 편집 */}
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              아카이브 카테고리 관리
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {archiveCategories.map((cat, idx) => (
                <div key={cat.category_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}</span>
                    {editingCatId === cat.category_id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          autoFocus
                          value={editingCatName}
                          onChange={e => setEditingCatName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateCategory(cat.category_id, editingCatName, cat.sort_order).then(success => {
                                if (success) {
                                  toast.success('카테고리명이 수정되었습니다.');
                                  setEditingCatId(null);
                                }
                              });
                            }
                            if (e.key === 'Escape') setEditingCatId(null);
                          }}
                          className="flex-1 text-xs font-bold border-b border-blue-400 bg-transparent outline-none py-0.5"
                        />
                        <button
                          onClick={() => {
                            updateCategory(cat.category_id, editingCatName, cat.sort_order).then(success => {
                              if (success) {
                                toast.success('카테고리명이 수정되었습니다.');
                                setEditingCatId(null);
                              }
                            });
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col flex-1 min-w-0 cursor-pointer" onClick={() => { setEditingCatId(cat.category_id); setEditingCatName(cat.display_name); }}>
                        <span className="text-xs font-black text-slate-700 truncate">{cat.display_name}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">{cat.category_id}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setEditingCatId(cat.category_id); setEditingCatName(cat.display_name); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </div>
              ))}
            </div>
            {categoriesLoading && <div className="text-center py-4 text-xs text-slate-400">카테고리 로딩 중...</div>}
          </div>

          {/* 브랜드 마스터 */}
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                브랜드 마스터 관리
                <span className="text-xs text-slate-400 font-normal">({brands.length}개)</span>
              </h3>
              <button
                onClick={() => setShowAddBrand(!showAddBrand)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors bg-blue-50/50"
              >
                {showAddBrand ? '취소' : '+ 새 브랜드 추가'}
              </button>
            </div>

            {/* 브랜드 추가 폼 */}
            {showAddBrand && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 ml-1">브랜드명 (영문)</label>
                    <input
                      placeholder="예: BARBOUR"
                      value={newBrand.brand_name}
                      onChange={e => setNewBrand(prev => ({ ...prev, brand_name: e.target.value.toUpperCase() }))}
                      className="w-full text-sm font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 ml-1">브랜드명 (한글)</label>
                    <input
                      placeholder="예: 바버"
                      value={newBrand.brand_name_ko}
                      onChange={e => setNewBrand(prev => ({ ...prev, brand_name_ko: e.target.value }))}
                      className="w-full text-sm font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 ml-1">소속 카테고리</label>
                    <select
                      value={newBrand.tier}
                      onChange={e => setNewBrand(prev => ({ ...prev, tier: e.target.value }))}
                      className="w-full text-sm font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {TIERS.map(t => (
                        <option key={t} value={t}>{TIER_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 ml-1">별칭 (쉼표 구분)</label>
                    <input
                      placeholder="예: BARBOUR INTERNATIONAL, 바버인터"
                      value={newBrand.aliases}
                      onChange={e => setNewBrand(prev => ({ ...prev, aliases: e.target.value }))}
                      className="w-full text-sm font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddBrand}
                  className="w-full py-2.5 bg-slate-900 text-white text-sm font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                >
                  브랜드 등록하기
                </button>
              </div>
            )}

            {brandsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : brands.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">등록된 브랜드가 없습니다</p>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {brands.map(brand => (
                  <div key={brand.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100 group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-800">{brand.brand_name}</span>
                      {brand.brand_name_ko && (
                        <span className="text-[10px] text-slate-400">({brand.brand_name_ko})</span>
                      )}
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${brand.tier === 'MILITARY' ? 'bg-green-100 text-green-700' :
                        brand.tier === 'WORKWEAR' ? 'bg-amber-100 text-amber-700' :
                          brand.tier === 'JAPAN' ? 'bg-red-100 text-red-700' :
                            brand.tier === 'HERITAGE' ? 'bg-blue-100 text-blue-700' :
                              brand.tier === 'BRITISH' ? 'bg-indigo-100 text-indigo-700' :
                                brand.tier === 'OUTDOOR' ? 'bg-teal-100 text-teal-700' :
                                  'bg-slate-100 text-slate-600'
                        }`}>
                        {TIER_LABELS[brand.tier] || brand.tier}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteBrand(brand.id)}
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 라이프사이클 설정 */}
      {section === 'lifecycle' && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            라이프사이클 설정
          </h3>

          {/* 스테이지 날짜 설정 */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500">스테이지 전환 기준일</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <label className="text-[10px] font-bold text-emerald-600 block mb-1">NEW → CURATED</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={lifecycle.newDays}
                    onChange={e => setLifecycle(prev => ({ ...prev, newDays: Number(e.target.value) }))}
                    min={1}
                    className="w-16 text-sm font-bold text-center border border-emerald-200 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-400 outline-none"
                  />
                  <span className="text-xs text-emerald-500">일</span>
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <label className="text-[10px] font-bold text-indigo-600 block mb-1">CURATED → ARCHIVE</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={lifecycle.curatedDays}
                    onChange={e => setLifecycle(prev => ({ ...prev, curatedDays: Number(e.target.value) }))}
                    min={1}
                    className="w-16 text-sm font-bold text-center border border-indigo-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                  <span className="text-xs text-indigo-500">일</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <label className="text-[10px] font-bold text-slate-600 block mb-1">ARCHIVE → CLEARANCE</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={lifecycle.archiveDays}
                    onChange={e => setLifecycle(prev => ({ ...prev, archiveDays: Number(e.target.value) }))}
                    min={1}
                    className="w-16 text-sm font-bold text-center border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-slate-400 outline-none"
                  />
                  <span className="text-xs text-slate-500">일</span>
                </div>
              </div>
            </div>
          </div>

          {/* 할인율 설정 */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500">스테이지별 할인율</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-[10px] font-bold text-indigo-600 mb-1">CURATED</p>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    value={lifecycle.curatedDiscount}
                    onChange={e => setLifecycle(prev => ({ ...prev, curatedDiscount: Number(e.target.value) }))}
                    min={0}
                    max={100}
                    className="w-12 text-sm font-bold text-center border border-indigo-200 rounded px-1 py-1 focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                  <span className="text-xs text-indigo-500 font-bold">%</span>
                </div>
              </div>
              <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-[10px] font-bold text-slate-600 mb-1">ARCHIVE</p>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    value={lifecycle.archiveDiscount}
                    onChange={e => setLifecycle(prev => ({ ...prev, archiveDiscount: Number(e.target.value) }))}
                    min={0}
                    max={100}
                    className="w-12 text-sm font-bold text-center border border-slate-300 rounded px-1 py-1 focus:ring-2 focus:ring-slate-400 outline-none"
                  />
                  <span className="text-xs text-slate-500 font-bold">%</span>
                </div>
              </div>
              <div className="text-center p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-[10px] font-bold text-amber-600 mb-1">CLEARANCE</p>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    value={lifecycle.clearanceDiscount}
                    onChange={e => setLifecycle(prev => ({ ...prev, clearanceDiscount: Number(e.target.value) }))}
                    min={0}
                    max={100}
                    className="w-12 text-sm font-bold text-center border border-amber-200 rounded px-1 py-1 focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                  <span className="text-xs text-amber-500 font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 현재 설정 요약 */}
          <div className="bg-gradient-to-r from-emerald-50 via-indigo-50 to-amber-50 border rounded-lg p-3">
            <p className="text-[10px] font-bold text-slate-500 mb-2">현재 설정 요약</p>
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded">NEW</span>
              <span className="text-slate-400">→{lifecycle.newDays}일→</span>
              <span className="bg-indigo-500 text-white px-1.5 py-0.5 rounded">CURATED -{lifecycle.curatedDiscount}%</span>
              <span className="text-slate-400">→{lifecycle.curatedDays}일→</span>
              <span className="bg-slate-700 text-white px-1.5 py-0.5 rounded">ARCHIVE -{lifecycle.archiveDiscount}%</span>
              <span className="text-slate-400">→{lifecycle.archiveDays}일→</span>
              <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded">CLEARANCE -{lifecycle.clearanceDiscount}%</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveLifecycle}
              className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              설정 저장하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
