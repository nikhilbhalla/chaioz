import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { DayModeProvider } from "@/contexts/DayModeContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/CartDrawer";
import AppDownloadBanner from "@/components/AppDownloadBanner";
import ExitIntentModal from "@/components/ExitIntentModal";
import Landing from "@/pages/Landing";
import MenuPage from "@/pages/Menu";
import Checkout from "@/pages/Checkout";
import Store from "@/pages/Store";
import Loyalty from "@/pages/Loyalty";
import Community from "@/pages/Community";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";

function App() {
  return (
    <div className="min-h-screen paper-warm text-chaioz-teal">
      <BrowserRouter>
        <AuthProvider>
          <DayModeProvider>
            <CartProvider>
              <Header />
              <CartDrawer />
              <AppDownloadBanner />
              <ExitIntentModal />
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
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </main>
              <Footer />
              <Toaster
                position="top-right"
                theme="light"
                toastOptions={{
                  style: { background: "#FFFFFF", border: "1px solid #E0DACE", color: "#0F4C4A" },
                }}
              />
            </CartProvider>
          </DayModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
