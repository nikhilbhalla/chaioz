import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, User, Menu as MenuIcon, X, LogOut } from "lucide-react";
import { useState } from "react";
import ChaiozLogo from "@/components/ChaiozLogo";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/menu", label: "Menu" },
  { to: "/store", label: "Shop" },
  { to: "/loyalty", label: "Rewards" },
  { to: "/community", label: "Community" },
];

export default function Header() {
  const { totals, setOpen } = useCart();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 glass-cream border-b border-chaioz-line"
      data-testid="site-header"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="header-home-link">
          <ChaiozLogo variant="color" className="h-8 sm:h-9" />
        </Link>

        <nav className="hidden lg:flex items-center gap-8 ml-6 flex-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label.toLowerCase()}`}
              className={`text-sm tracking-wide uppercase transition-colors ${
                pathname.startsWith(l.to)
                  ? "text-chaioz-saffron"
                  : "text-chaioz-teal/80 hover:text-chaioz-saffron"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            data-testid="header-cart-button"
            className="relative text-chaioz-teal hover:text-chaioz-saffron hover:bg-chaioz-tealSoft"
          >
            <ShoppingBag className="w-5 h-5" />
            {totals.count > 0 && (
              <span
                data-testid="cart-count-badge"
                className="absolute -top-1 -right-1 bg-chaioz-saffron text-chaioz-teal text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
              >
                {totals.count}
              </span>
            )}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="header-user-menu"
                  className="text-chaioz-teal hover:text-chaioz-saffron hover:bg-chaioz-tealSoft"
                >
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-chaioz-line text-chaioz-teal w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" data-testid="header-user-name">{user.name}</span>
                    <span className="text-xs text-chaioz-teal/60">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-chaioz-line" />
                <DropdownMenuItem onClick={() => navigate("/account")} data-testid="menu-account">My Account</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/loyalty")} data-testid="menu-rewards">
                  {user.loyalty_points || 0} pts • {user.loyalty_tier}
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-chaioz-line" />
                <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate("/login")}
              data-testid="header-login-button"
              className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full px-4"
            >
              Sign in
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-chaioz-teal"
            onClick={() => setMobile((v) => !v)}
            data-testid="mobile-menu-toggle"
          >
            {mobile ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobile && (
        <div className="lg:hidden border-t border-chaioz-line bg-chaioz-cream/95 backdrop-blur-xl">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobile(false)}
                data-testid={`mobile-nav-${l.label.toLowerCase()}`}
                className="text-sm uppercase tracking-wide text-chaioz-teal/90 py-2"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
