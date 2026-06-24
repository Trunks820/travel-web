import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTripStore } from '@/stores/tripStore';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = useTripStore((s) => s.result);

  // 「目的地」= 当前结果页：有结果跳结果页，否则回首页填表。
  // job_id 用绑定在结果上的 jobId（而非 currentJobId，后者可能已指向新任务）
  const goDestination = () => {
    if (result) {
      const q = `?job_id=${encodeURIComponent(result.jobId)}`;
      navigate(`/result/${result.data.result_id}${q}`);
    } else {
      navigate('/');
    }
  };

  const onHome = location.pathname === '/';
  const onResult = location.pathname.startsWith('/result') || location.pathname.startsWith('/plan');

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
      <div className="flex items-center justify-between px-8 py-2">
        <div className="flex items-center space-x-8">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.svg" alt="云途 YunTu" className="h-9 w-9" />
            <span className="text-2xl font-bold text-gray-800 tracking-tight">
              云途 <span className="text-primary-500 font-normal">YunTu</span>
            </span>
          </Link>

          {/* 导航菜单 */}
          <nav className="hidden lg:flex items-center space-x-8 text-gray-600 font-medium">
            <Link
              to="/"
              className={
                onHome
                  ? 'text-primary-500 border-b-2 border-primary-500 pb-1'
                  : 'hover:text-gray-900 transition-colors'
              }
            >
              AI 行程规划
            </Link>
            <button
              type="button"
              onClick={goDestination}
              className={
                onResult
                  ? 'text-primary-500 border-b-2 border-primary-500 pb-1'
                  : 'hover:text-gray-900 transition-colors'
              }
            >
              目的地
            </button>
          </nav>
        </div>

        {/* 右侧操作（语言 + 头像，未来接入登录态） */}
        <div className="flex items-center space-x-6">
          <button className="flex items-center space-x-1 text-gray-600 text-sm">
            <i className="fas fa-globe" aria-hidden="true"></i>
            <span>中文</span>
            <i className="fas fa-chevron-down text-[10px]" aria-hidden="true"></i>
          </button>
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felicia"
            alt="用户"
            className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
          />
        </div>
      </div>
    </header>
  );
}
