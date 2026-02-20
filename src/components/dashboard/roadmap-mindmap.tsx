'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Edit3, ChevronDown, ChevronRight, Target, Rocket, Flag } from 'lucide-react';
import { toast } from 'sonner';

interface RoadmapNode {
  id: string;
  term: string; // short, mid, long
  parent_id: string | null;
  content: string;
  status: string; // TODO, IN_PROGRESS, DONE
  color: string | null;
  sort_order: number;
}

const TERMS = [
  { key: 'short', label: '단기', sublabel: '1~3개월', icon: Rocket, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'mid', label: '중기', sublabel: '3~12개월', icon: Target, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  { key: 'long', label: '장기', sublabel: '1~3년', icon: Flag, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
];

const NODE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

interface Props {
  isAdmin: boolean;
}

export function RoadmapMindmap({ isAdmin }: Props) {
  const router = useRouter();
  const [nodes, setNodes] = useState<RoadmapNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<{ term: string; parentId: string | null } | null>(null);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const fetchNodes = useCallback(async () => {
    try {
      const res = await fetch('/api/roadmap');
      const data = await res.json();
      setNodes(data.items || []);
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  const addNode = async (term: string, parentId: string | null) => {
    if (!newContent.trim()) return;
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, parentId, content: newContent.trim(), color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)] })
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
      toast.success('추가 완료');
      setNewContent('');
      setAddingTo(null);
      fetchNodes();
    } catch { toast.error('추가 실패'); }
  };

  const updateNode = async (id: string, updates: { content?: string; color?: string; status?: string }) => {
    try {
      const node = nodes.find(n => n.id === id);
      if (!node) return;

      const body = {
        id,
        content: updates.content !== undefined ? updates.content : node.content,
        color: updates.color !== undefined ? updates.color : node.color,
        status: updates.status !== undefined ? updates.status : node.status
      };

      const res = await fetch('/api/roadmap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }

      if (updates.content === undefined) {
        // If not content update (e.g. status), just refresh silently or toast
        // toast.success('상태 변경'); 
      } else {
        setEditingId(null);
      }
      fetchNodes();
    } catch { toast.error('수정 실패'); }
  };

  const toggleStatus = (e: React.MouseEvent, node: RoadmapNode) => {
    e.stopPropagation();
    const map: Record<string, string> = { 'TODO': 'IN_PROGRESS', 'IN_PROGRESS': 'DONE', 'DONE': 'TODO' };
    const next = map[node.status || 'TODO'] || 'IN_PROGRESS';
    updateNode(node.id, { status: next });
  };

  const deleteNode = async (id: string) => {
    if (!confirm('이 항목과 하위 항목을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/roadmap?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
      toast.success('삭제 완료');
      fetchNodes();
    } catch { toast.error('삭제 실패'); }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getChildren = (parentId: string) => nodes.filter(n => n.parent_id === parentId);
  const getRoots = (term: string) => nodes.filter(n => n.term === term && !n.parent_id);

  const renderNode = (node: RoadmapNode, depth: number, termConfig: typeof TERMS[number]) => {
    const children = getChildren(node.id);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    const isEditing = editingId === node.id;
    const isAddingChild = addingTo?.parentId === node.id && addingTo?.term === node.term;

    return (
      <div key={node.id} className="relative">
        <div className="flex items-start gap-2 group py-1">
          {/* 토글/아이콘 */}
          <div className="flex items-center mt-1 shrink-0 w-4 justify-center z-10">
            {hasChildren ? (
              <button onClick={() => toggleCollapse(node.id)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                {isCollapsed
                  ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                }
              </button>
            ) : (
              <button
                onClick={(e) => toggleStatus(e, node)}
                className={`w-3 h-3 flex items-center justify-center rounded-full transition-all ring-1 dark:ring-0 ${node.status === 'DONE' ? 'bg-emerald-500 ring-emerald-500' :
                  node.status === 'IN_PROGRESS' ? 'bg-blue-500 ring-blue-500 animate-pulse' :
                    'bg-white dark:bg-slate-800 ring-slate-300 dark:ring-slate-600'
                  }`}
              >
                {node.status === 'DONE' && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                {node.status === 'IN_PROGRESS' && <div className="w-1 h-1 bg-white rounded-full"></div>}
                {(!node.status || node.status === 'TODO') && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>}
              </button>
            )}
          </div>

          {/* 노드 내용 */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                <input
                  autoFocus
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') updateNode(node.id, { content: editContent.trim() });
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-emerald-500 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button onClick={() => updateNode(node.id, { content: editContent.trim() })} className="text-[10px] whitespace-nowrap px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-colors">저장</button>
                <button onClick={() => setEditingId(null)} className="text-[10px] whitespace-nowrap px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 rounded font-bold transition-colors">취소</button>
              </div>
            ) : (
              <div className="flex items-start justify-between group/item">
                <span
                  className={`text-sm cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline decoration-slate-400 underline-offset-2 ${depth === 0 ? 'font-bold' : 'font-medium'} ${node.status === 'DONE' ? 'text-slate-400 line-through decoration-slate-300' :
                    node.status === 'IN_PROGRESS' ? 'text-blue-600 dark:text-blue-400 font-bold' :
                      'text-slate-700 dark:text-slate-300'
                    }`}
                  onClick={() => router.push(`/admin/roadmap/detail?id=${node.id}`)}
                >
                  {node.content}
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(node.id); setEditContent(node.content); }}
                      className="p-1 text-slate-300 hover:text-blue-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="수정"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { setAddingTo({ term: node.term, parentId: node.id }); setNewContent(''); }}
                      className="p-1 text-slate-300 hover:text-emerald-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="하도록(하위) 추가"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteNode(node.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 자식 컨테이너 */}
        <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          {/* 자식 추가 입력폼 */}
          {isAddingChild && (
            <div className="py-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-1.5">
                <div className="w-3 shrink-0 flex justify-center"><div className="w-1 h-1 bg-slate-300 rounded-full"></div></div>
                <input
                  autoFocus
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addNode(node.term, node.id);
                    if (e.key === 'Escape') setAddingTo(null);
                  }}
                  placeholder="하위 항목 입력..."
                  className="flex-1 text-xs px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
                <button onClick={() => addNode(node.term, node.id)} className="text-[10px] whitespace-nowrap px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-colors">추가</button>
                <button onClick={() => setAddingTo(null)} className="text-[10px] whitespace-nowrap px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 rounded font-bold transition-colors">취소</button>
              </div>
            </div>
          )}

          {hasChildren && !isCollapsed && (
            <div className="mt-0.5 space-y-0.5">
              {children.map(child => renderNode(child, depth + 1, termConfig))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
        <div className="animate-pulse flex gap-6">
          <div className="flex-1 h-24 bg-slate-100 rounded-lg"></div>
          <div className="flex-1 h-24 bg-slate-100 rounded-lg"></div>
          <div className="flex-1 h-24 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">사업 로드맵</h3>
            <p className="text-[10px] text-slate-400 font-medium">Business Direction Mindmap</p>
          </div>
        </div>
        {nodes.length > 0 && (
          <span className="text-[10px] font-bold text-slate-400">{nodes.length}개 항목</span>
        )}
      </div>

      {/* 3컬럼 마인드맵 */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">
        {TERMS.map(term => {
          const roots = getRoots(term.key);
          const isAddingRoot = addingTo?.term === term.key && addingTo?.parentId === null;
          const Icon = term.icon;

          return (
            <div key={term.key} className="p-4 min-h-[160px]">
              {/* 컬럼 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md bg-gradient-to-br ${term.gradient}`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <span className={`text-xs font-black ${term.text}`}>{term.label}</span>
                    <span className="text-[9px] text-slate-400 font-medium ml-1.5">{term.sublabel}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => { setAddingTo({ term: term.key, parentId: null }); setNewContent(''); }}
                    className={`p-1 rounded-md ${term.bg} ${term.text} hover:opacity-80 transition-opacity`}
                    title="항목 추가"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 루트 추가 입력 */}
              {isAddingRoot && (
                <div className="mb-3">
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addNode(term.key, null); if (e.key === 'Escape') setAddingTo(null); }}
                      placeholder="새 항목 입력..."
                      className={`flex-1 text-xs px-2 py-1.5 border rounded-md focus:outline-none focus:ring-1 ${term.border} focus:ring-slate-400`}
                    />
                    <button onClick={() => addNode(term.key, null)} className="text-[10px] px-2 py-1 bg-slate-800 text-white rounded-md font-bold">추가</button>
                    <button onClick={() => setAddingTo(null)} className="text-[10px] px-1.5 py-1 text-slate-400">취소</button>
                  </div>
                </div>
              )}

              {/* 노드 트리 */}
              {roots.length === 0 && !isAddingRoot ? (
                <div className={`text-center py-8 ${term.bg} rounded-lg border border-dashed ${term.border}`}>
                  <p className="text-[11px] text-slate-400 font-medium">아직 계획이 없습니다</p>
                  {isAdmin && (
                    <button
                      onClick={() => { setAddingTo({ term: term.key, parentId: null }); setNewContent(''); }}
                      className={`mt-2 text-[10px] font-bold ${term.text} hover:underline`}
                    >
                      + 첫 항목 추가
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-0">
                  {roots.map(node => renderNode(node, 0, term))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
