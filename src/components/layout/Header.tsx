import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'AI 行程规划' },
  { path: '/destinations', label: '目的地' },
  { path: '/inspiration', label: '旅行灵感' },
  { path: '/trips', label: '我的行程' },
  { path: '/membership', label: '会员中心' },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
      <div className="flex items-center justify-between px-8 py-2">
        <div className="flex items-center space-x-8">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto rounded-full" />
            <span className="text-2xl font-bold text-gray-800 tracking-tight">
              云途 <span className="text-[#008080] font-normal">YunTu</span>
            </span>
          </Link>

          {/* 导航菜单 */}
          <nav className="hidden lg:flex items-center space-x-8 text-gray-600 font-medium">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={
                    isActive
                      ? 'text-[#008080] border-b-2 border-[#008080] pb-1'
                      : 'hover:text-gray-900 transition-colors'
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center space-x-6">
          <button className="bg-orange-50 text-orange-500 px-4 py-1.5 rounded-full text-sm font-medium flex items-center hover:bg-orange-100 transition-colors">
            <span className="mr-2 text-xs">✦</span> 升级会员
          </button>
          <button className="flex items-center space-x-1 text-gray-600 text-sm">
            <i className="fas fa-globe"></i>
            <span>中文</span>
            <i className="fas fa-chevron-down text-[10px]"></i>
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
