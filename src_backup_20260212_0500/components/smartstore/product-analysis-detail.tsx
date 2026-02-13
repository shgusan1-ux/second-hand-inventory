'use client';

import { useState, useEffect } from 'react';

interface Product {
  originProductNo: string;
  name: string;
  salePrice: number;
  thumbnailUrl?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product;
  onSaved: () => void;
}

// 의류타입별 세부타입 옵션
const subTypeOptions: Record<string, string[]> = {
  '상의': ['티셔츠', '셔츠', '블라우스', '니트', '스웨터', '후디', '맨투맨', '폴로', '탱크탑', '롱슬리브', '반팔', '터틀넥', '카라티'],
  '하의': ['팬츠', '데님', '스커트', '쇼츠', '큐롯', '슬랙스', '조거', '치노', '카고팬츠', '와이드팬츠', '부츠컷'],
  '아우터': ['자켓', '코트', '점퍼', '블레이저', '가디건', '베스트', '야상', '윈드브레이커', '패딩', '트렌치코트', '라이더', '필드자켓', '사파리자켓'],
  '원피스': ['원피스', '드레스', '점프수트'],
  '기타': ['가방', '모자', '액세서리', '신발', '머플러', '벨트', '기타'],
};

const tierColor: Record<string, string> = {
  MILITARY: 'bg-emerald-700 text-white',
  WORKWEAR: 'bg-amber-600 text-white',
  OUTDOOR: 'bg-teal-600 text-white',
  JAPAN: 'bg-red-500 text-white',
  HERITAGE: 'bg-blue-500 text-white',
  BRITISH: 'bg-indigo-500 text-white',
  OTHER: 'bg-slate-400 text-white',
};

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-black w-8 text-right">{value}%</span>
    </div>
  );
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${className}`}>{children}</span>;
}

export function ProductAnalysisDetail({ open, onClose, product, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);

  // 편집 폼 상태
  const [brand, setBrand] = useState('');
  const [grade, setGrade] = useState('A급');
  const [clothingType, setClothingType] = useState('기타');
  const [clothingSubType, setClothingSubType] = useState('기타');
  const [gender, setGender] = useState('UNKNOWN');
  const [pattern, setPattern] = useState('솔리드');
  const [fabric, setFabric] = useState('');
  const [size, setSize] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [gradeReason, setGradeReason] = useState('');
  const [colorInput, setColorInput] = useState('');

  // 데이터 로드
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams({
      originProductNo: product.originProductNo,
      name: product.name,
    });
    fetch(`/api/smartstore/vision/detail?${params}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
          // Vision 결과가 있으면 그걸로, 없으면 텍스트 분류로 초기화
          const v = res.data.vision;
          const t = res.data.text;
          setBrand(v?.brand || t?.brand || '');
          setGrade(v?.grade || 'A급');
          setClothingType(v?.clothingType || t?.clothingType || '기타');
          setClothingSubType(v?.clothingSubType || t?.clothingSubType || '기타');
          setGender(v?.gender || t?.gender || 'UNKNOWN');
          setPattern(v?.pattern || '솔리드');
          setFabric(v?.fabric || '');
          setSize(v?.size || t?.size || '');
          setColors(v?.colors || []);
          setGradeReason(v?.gradeReason || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, product.originProductNo, product.name]);

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/smartstore/vision/detail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originProductNo: product.originProductNo,
          productName: product.name,
          brand, grade, gradeReason,
          clothingType, clothingSubType,
          gender, pattern, fabric, size, colors,
          confidence: data?.vision?.confidence || 0,
        }),
      });
      const result = await res.json();
      if (result.success) {
        import('sonner').then(({ toast }) => toast.success('분류 수정 저장 완료'));
        onSaved();
      } else {
        import('sonner').then(({ toast }) => toast.error(result.error || '저장 실패'));
      }
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error(err.message));
    } finally {
      setSaving(false);
    }
  };

  // 색상 추가
  const addColor = () => {
    const c = colorInput.trim();
    if (c && !colors.includes(c)) {
      setColors([...colors, c]);
      setColorInput('');
    }
  };

  if (!open) return null;

  // 오버레이 + 모달
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center gap-3 p-4 border-b bg-slate-50">
          {product.thumbnailUrl && (
            <img src={product.thumbnailUrl} alt="" className="w-14 h-14 rounded-lg object-cover border" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{product.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-slate-400">#{product.originProductNo}</span>
              <span className="text-[11px] font-extrabold text-blue-600">{product.salePrice?.toLocaleString()}원</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 (스크롤) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="ml-2 text-sm text-slate-400">분석 데이터 로딩...</span>
            </div>
          ) : (
            <>
              {/* Vision vs Text 비교 */}
              <div className="grid grid-cols-2 gap-3">
                {/* 텍스트 분류 */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">텍스트 분류</p>
                  {data?.text && (
                    <>
                      <div>
                        <span className="text-[9px] text-slate-400">브랜드</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge className={tierColor[data.text.brandTier] || 'bg-slate-400 text-white'}>
                            {data.text.brand || '-'}
                          </Badge>
                          <span className="text-[9px] text-slate-400">{data.text.brandTier}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400">의류타입</span>
                        <p className="text-[11px] font-medium text-slate-700">{data.text.clothingType} / {data.text.clothingSubType}</p>
                      </div>
                      <div className="flex gap-3">
                        <div>
                          <span className="text-[9px] text-slate-400">성별</span>
                          <p className="text-[11px] font-medium">{data.text.gender}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400">사이즈</span>
                          <p className="text-[11px] font-medium">{data.text.size || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400">신뢰도</span>
                        <ConfidenceBar value={data.text.confidence} color={data.text.confidence >= 70 ? 'bg-emerald-500' : data.text.confidence >= 40 ? 'bg-amber-500' : 'bg-red-500'} />
                      </div>
                    </>
                  )}
                </div>

                {/* Vision 분석 */}
                <div className="bg-violet-50 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Vision 분석</p>
                  {data?.vision && (data.vision.analysisStatus === 'completed' || data.vision.analysisStatus === 'manual') ? (
                    <>
                      <div>
                        <span className="text-[9px] text-violet-400">브랜드</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge className="bg-violet-600 text-white">{data.vision.brand || '-'}</Badge>
                          {data.vision.grade && (
                            <Badge className={
                              data.vision.grade === 'S급' ? 'bg-yellow-400 text-yellow-900' :
                              data.vision.grade === 'A급' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-orange-100 text-orange-700'
                            }>{data.vision.grade}</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-violet-400">의류타입</span>
                        <p className="text-[11px] font-medium text-slate-700">{data.vision.clothingType} / {data.vision.clothingSubType}</p>
                      </div>
                      <div className="flex gap-3">
                        <div>
                          <span className="text-[9px] text-violet-400">성별</span>
                          <p className="text-[11px] font-medium">{data.vision.gender}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-violet-400">사이즈</span>
                          <p className="text-[11px] font-medium">{data.vision.size || '-'}</p>
                        </div>
                      </div>
                      {data.vision.colors?.length > 0 && (
                        <div>
                          <span className="text-[9px] text-violet-400">색상</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {data.vision.colors.map((c: string, i: number) => (
                              <Badge key={i} className="bg-white border border-violet-200 text-violet-700">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3">
                        {data.vision.pattern && (
                          <div>
                            <span className="text-[9px] text-violet-400">패턴</span>
                            <p className="text-[11px] font-medium">{data.vision.pattern}</p>
                          </div>
                        )}
                        {data.vision.fabric && (
                          <div>
                            <span className="text-[9px] text-violet-400">소재</span>
                            <p className="text-[11px] font-medium">{data.vision.fabric}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-[9px] text-violet-400">신뢰도</span>
                        <ConfidenceBar value={data.vision.confidence} color="bg-violet-500" />
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-[11px] text-violet-400">Vision 분석 전</p>
                      <p className="text-[9px] text-violet-300 mt-1">자동화 탭에서 분석을 실행하세요</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 통합 결과 */}
              {data?.merged && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">통합 결과</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={tierColor[data.merged.brandTier] || 'bg-slate-400 text-white'}>
                      {data.merged.brand || '-'}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700">{data.merged.clothingType}</Badge>
                    <Badge className={
                      data.merged.gender === 'MAN' ? 'bg-blue-100 text-blue-600' :
                      data.merged.gender === 'WOMAN' ? 'bg-pink-100 text-pink-600' :
                      'bg-slate-100 text-slate-500'
                    }>{data.merged.gender}</Badge>
                    {data.merged.visionGrade && (
                      <Badge className="bg-yellow-100 text-yellow-800">{data.merged.visionGrade}</Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-[9px] text-blue-400">통합 신뢰도</span>
                    <ConfidenceBar value={data.merged.mergedConfidence || data.merged.confidence} color="bg-blue-500" />
                  </div>
                </div>
              )}

              {/* 수동 수정 폼 */}
              <div className="border rounded-xl p-3 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">수동 수정</p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">브랜드</label>
                    <input
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="브랜드명"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">등급</label>
                    <select value={grade} onChange={e => setGrade(e.target.value)}
                      className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none">
                      <option value="S급">S급 (새상품급)</option>
                      <option value="A급">A급 (양호)</option>
                      <option value="B급">B급 (사용감)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">의류타입</label>
                    <select
                      value={clothingType}
                      onChange={e => {
                        setClothingType(e.target.value);
                        const subs = subTypeOptions[e.target.value] || ['기타'];
                        setClothingSubType(subs[0]);
                      }}
                      className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {['상의', '하의', '아우터', '원피스', '기타'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">세부타입</label>
                    <select value={clothingSubType} onChange={e => setClothingSubType(e.target.value)}
                      className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none">
                      {(subTypeOptions[clothingType] || ['기타']).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">성별</label>
                    <select value={gender} onChange={e => setGender(e.target.value)}
                      className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none">
                      <option value="MAN">남성</option>
                      <option value="WOMAN">여성</option>
                      <option value="UNISEX">유니섹스</option>
                      <option value="UNKNOWN">미분류</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">패턴</label>
                    <select value={pattern} onChange={e => setPattern(e.target.value)}
                      className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none">
                      {['솔리드', '스트라이프', '체크', '도트', '프린트', '카모', '페이즐리', '기타'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">소재</label>
                    <input value={fabric} onChange={e => setFabric(e.target.value)}
                      className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="면 100%" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">사이즈</label>
                    <input value={size} onChange={e => setSize(e.target.value)}
                      className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="M, L, XL..." />
                  </div>
                </div>

                {/* 등급 사유 */}
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">등급 판정 사유</label>
                  <input value={gradeReason} onChange={e => setGradeReason(e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="상태 양호, 약간의 사용감 등" />
                </div>

                {/* 색상 태그 */}
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">색상</label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {colors.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-bold">
                        {c}
                        <button onClick={() => setColors(colors.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      value={colorInput}
                      onChange={e => setColorInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
                      className="flex-1 px-2 py-1 text-[11px] border rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                      placeholder="색상 입력 후 Enter"
                    />
                    <button onClick={addColor} className="px-2 py-1 text-[10px] font-bold bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200">추가</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        {!loading && (
          <div className="flex items-center justify-end gap-2 p-4 border-t bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[11px] font-bold text-slate-500 bg-white border rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
