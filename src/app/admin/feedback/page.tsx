import { getSession } from '@/lib/auth';
import { getFeedbacks } from '@/lib/feedback-actions';
import { FeedbackManager } from './feedback-manager';
import { redirect } from 'next/navigation';

export default async function FeedbackPage() {
    const session = await getSession();

    // Auth check
    const isAdmin = session && ['대표자', '경영지원', '점장'].includes(session.job_title);
    if (!isAdmin) {
        redirect('/');
    }

    const feedbacks = await getFeedbacks();

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-100 italic">SYSTEM IMPROVEMENT HUB</h1>
                <p className="text-slate-400 text-sm">직원들이 제안한 버그 및 기능 개선 요청을 관리합니다.</p>
            </div>

            <FeedbackManager initialFeedbacks={feedbacks} />
        </div>
    );
}
