import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/CartDrawer";
import Landing from "@/pages/Landing";
import MenuPage from "@/pages/Menu";
import Checkout from "@/pages/Checkout";
import Store from "@/pages/Store";
import Loyalty from "@/pages/Loyalty";
import Community from "@/pages/Community";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";

function App() {
  return (
    <div className="min-h-screen bg-chaioz-ink text-chaioz-cream">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Header />
            <CartDrawer />
            <main>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/store" element={<Store />} />
                <Route path="/loyalty" element={<Loyalty />} />
                <Route path="/community" element={<Community />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/account" element={<Account />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
            <Footer />
            <Toaster
              position="top-right"
              theme="dark"
              toastOptions={{
                style: { background: "#0A1413", border: "1px solid #1A2E2C", color: "#FDFBF7" },
              }}
            />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
