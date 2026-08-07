import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, History, LayoutDashboard, Database } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-surface-container-high border-b border-outline-variant/30 px-lg py-md flex justify-between items-center">
      <div className="flex items-center gap-md">
        <h1 className="font-h2 text-h2 text-primary font-black italic uppercase tracking-tighter">Neon Night Lounge</h1>
        <div className="hidden md:flex gap-md ml-xl">
          {user?.role === 'user' ? (
            <>
              <Link to="/" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs">
                <Database className="w-5 h-5" /> Book Table
              </Link>
              <Link to="/history" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs">
                <History className="w-5 h-5" /> My Bookings
              </Link>
            </>
          ) : (
            <>
              <Link to="/admin" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs">
                <LayoutDashboard className="w-5 h-5" /> Dashboard
              </Link>
              <Link to="/admin/tables" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs">
                <Database className="w-5 h-5" /> Manage Tables
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-md">
        <span className="text-on-surface font-body-md hidden sm:block">Welcome, {user?.name}</span>
        <button onClick={handleLogout} className="text-error hover:text-error-container transition-colors flex items-center gap-xs">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
