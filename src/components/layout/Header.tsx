import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const onHome = location.pathname === '/';

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
          </nav>
        </div>


      </div>
    </header>
  );
}
