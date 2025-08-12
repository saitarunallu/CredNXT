import { Link, useLocation } from "wouter";
import { Home, Plus, Clock, User, BarChart3 } from "lucide-react";

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const handleNavigation = (href: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    // Force a clean navigation by using setLocation directly
    setLocation(href);
  };

  const navItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Home",
      active: location === "/dashboard"
    },
    {
      href: "/offers",
      icon: Clock,
      label: "Offers",
      active: location.startsWith("/offers") && location !== "/offers/create"
    },
    {
      href: "/offers/create",
      icon: Plus,
      label: "Create",
      active: location === "/offers/create",
      special: true
    },
    {
      href: "/analytics",
      icon: BarChart3,
      label: "Analytics",
      active: location === "/analytics"
    },
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      active: location === "/profile"
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40 backdrop-blur-md bg-opacity-95">
      <div className="flex justify-around items-center max-w-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          if (item.special) {
            return (
              <button 
                key={item.href} 
                onClick={() => handleNavigation(item.href)}
                className="bg-transparent border-none p-0 cursor-pointer"
              >
                <div className="flex flex-col items-center relative">
                  <div className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 mb-1 hover:scale-110 active:scale-95">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-xs font-medium transition-all duration-200 ${
                    item.active 
                      ? "text-blue-600 font-semibold" 
                      : "text-gray-600"
                  }`}>
                    {item.label}
                  </span>
                  {item.active && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                  )}
                </div>
              </button>
            );
          }

          return (
            <button 
              key={item.href} 
              onClick={() => handleNavigation(item.href)}
              className="bg-transparent border-none p-0 cursor-pointer"
            >
              <div className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:scale-105 active:scale-95 relative">
                <Icon 
                  className={`w-6 h-6 mb-1 transition-all duration-200 ${
                    item.active 
                      ? "text-blue-600 scale-110" 
                      : "text-gray-500 hover:text-blue-600"
                  }`} 
                />
                <span 
                  className={`text-xs font-medium transition-all duration-200 ${
                    item.active 
                      ? "text-blue-600 font-semibold" 
                      : "text-gray-500 hover:text-blue-600"
                  }`}
                >
                  {item.label}
                </span>
                {item.active && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}