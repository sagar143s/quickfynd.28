'use client';

import { PackageIcon, Search, ShoppingCart, LifeBuoy, Menu, X, HeartIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { auth } from '../lib/firebase';
import { getAuth } from "firebase/auth";
console.log("Firebase UID:", getAuth().currentUser?.uid);
import Image from 'next/image';
import axios from "axios";
import toast from "react-hot-toast";
import Logo from "../assets/Asset11.png";
import Truck from '../assets/delivery.png';
import SignInModal from './SignInModal';

const Navbar = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [supportDropdownOpen, setSupportDropdownOpen] = useState(false);
  const hoverTimer = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const cartCount = useSelector((state) => state.cart.total);
  const [signInOpen, setSignInOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
      console.log("Navbar user:", user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchIfLoggedIn = () => {
      if (auth.currentUser) {
        fetchWishlistCount();
      } else {
        setWishlistCount(0);
      }
    };
    fetchIfLoggedIn();
    // Listen for wishlist updates
    const handleWishlistUpdate = () => {
      fetchIfLoggedIn();
    };
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, []);

  const fetchWishlistCount = async () => {
    try {
      if (!auth.currentUser) {
        setWishlistCount(0);
        return;
      }
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get('/api/wishlist', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setWishlistCount(data.wishlist?.length || 0);
    } catch (error) {
      console.error('Error fetching wishlist count:', error);
      setWishlistCount(0);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/shop?search=${search}`);
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    if (!cartCount || cartCount === 0) {
      toast.error("Your cart is empty. Add some products to get started!", {
        duration: 3000,
        icon: '🛒',
      });
      return;
    }
    router.push("/cart");
  };
  

  // Seller email check (customize as needed)
  const isSeller = firebaseUser && firebaseUser.email && (
    firebaseUser.email.endsWith('@gmail.com') || firebaseUser.email === 'rohithsagarm@gmail.com' // add more seller emails as needed
  );

  return (
    <nav className="relative bg-white border-b border-gray-200 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 transition-all">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src={Logo} alt="Qui Logo" width={140} height={40} className="object-contain" priority />
          </Link>

          {/* Center - Links and Search */}
          <div className="hidden lg:flex items-center flex-1 justify-center gap-6 px-8">
            <Link href="/top-selling" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition whitespace-nowrap">
              Top Selling Items
            </Link>
            <Link href="/new" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition whitespace-nowrap">
              New
            </Link>

            <Link href="/5-star-rated" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition whitespace-nowrap">
              5 Star Rated
            </Link>
          
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex items-center w-full max-w-md text-sm gap-2 bg-gray-100 px-4 py-2.5 rounded-full border border-gray-200 focus-within:border-orange-300 focus-within:ring-1 focus-within:ring-orange-200 transition">
              <Search size={18} className="text-gray-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search products"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none placeholder-gray-500 text-gray-700"
                required
              />
            </form>
          </div>

          {/* Right Side - Actions */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            {/* Login/User Button */}
            {firebaseUser ? (
              <div
                className="relative flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full cursor-pointer group"
                onMouseEnter={() => setUserDropdownOpen(true)}
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                {firebaseUser.photoURL ? (
                  <Image src={firebaseUser.photoURL} alt="User" width={32} height={32} className="rounded-full object-cover" />
                ) : (
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
                    {firebaseUser.displayName?.[0]?.toUpperCase() || firebaseUser.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
                <span className="font-medium text-gray-700 text-sm">Hi, {firebaseUser.displayName || firebaseUser.email}</span>
                {/* Dashboard button for seller */}
                {isSeller && (
                  <button
                    className="ml-2 px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-full transition"
                    onClick={() => router.push('/store')}
                  >
                    Dashboard
                  </button>
                )}
                {/* User Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-12 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2">
                    <button
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition text-sm"
                      onClick={async () => {
                        await auth.signOut();
                        setUserDropdownOpen(false);
                        router.push('/');
                        toast.success('Signed out successfully');
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-medium rounded-full"
              >
                Login
              </button>
            )}

            {/* Support Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (hoverTimer.current) clearTimeout(hoverTimer.current);
                setSupportDropdownOpen(true);
              }}
              onMouseLeave={() => {
                if (hoverTimer.current) clearTimeout(hoverTimer.current);
                hoverTimer.current = setTimeout(() => setSupportDropdownOpen(false), 200);
              }}
            >
              {/* <button
                onClick={() => setSupportDropdownOpen((v) => !v)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full flex items-center gap-2 transition text-sm font-medium"
                aria-haspopup="menu"
                aria-expanded={supportDropdownOpen}
              >
                <LifeBuoy size={16} /> Support
              </button> */}
              {supportDropdownOpen && (
                <ul
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 text-sm text-gray-700 z-50 overflow-hidden"
                  onMouseEnter={() => {
                    if (hoverTimer.current) clearTimeout(hoverTimer.current);
                    setSupportDropdownOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (hoverTimer.current) clearTimeout(hoverTimer.current);
                    hoverTimer.current = setTimeout(() => setSupportDropdownOpen(false), 200);
                  }}
                  role="menu"
                >
                  <li><Link href="/faq" className="block px-4 py-2.5 hover:bg-gray-50 transition">FAQ</Link></li>
                  <li><Link href="/support" className="block px-4 py-2.5 hover:bg-gray-50 transition">Support</Link></li>
                  <li><Link href="/terms" className="block px-4 py-2.5 hover:bg-gray-50 transition">Terms & Conditions</Link></li>
                  <li><Link href="/privacy-policy" className="block px-4 py-2.5 hover:bg-gray-50 transition">Privacy Policy</Link></li>
                  <li><Link href="/return-policy" className="block px-4 py-2.5 hover:bg-gray-50 transition">Return Policy</Link></li>
                </ul>
              )}
            </div>

            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-2 hover:bg-gray-100 rounded-full transition group">
              <HeartIcon size={22} className="text-gray-600 group-hover:text-orange-500 transition" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] font-bold text-white bg-orange-500 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button onClick={handleCartClick} className="relative p-2 hover:bg-gray-100 rounded-full transition group">
  <ShoppingCart size={22} className="text-gray-600 group-hover:text-blue-600 transition" />
  {isClient && cartCount > 0 && (
    <span className="absolute -top-1 -right-1 text-[10px] font-bold text-white bg-blue-600 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {cartCount}
    </span>
  )}
</button>

          </div>


          {/* Mobile Hamburger */}
          <div className="lg:hidden flex items-center gap-3">
          <button onClick={handleCartClick} className="relative p-2">
  <ShoppingCart size={20} className="text-gray-600" />
  {isClient && cartCount > 0 && (
    <span className="absolute -top-1 -right-1 text-[10px] font-bold text-white bg-blue-600 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {cartCount}
    </span>
  )}
</button>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1">
              {mobileMenuOpen ? <X size={24} className="text-gray-700" /> : <Menu size={24} className="text-gray-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - Below main navbar on mobile */}
        <div className="lg:hidden pb-3">
          <form onSubmit={handleSearch} className="flex items-center text-sm gap-2 bg-gray-100 px-4 py-2.5 rounded-full border border-gray-200">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none placeholder-gray-500 text-gray-700"
              required
            />
          </form>
        </div>

        {/* Mobile Overlay Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/60 z-50" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute top-0 right-0 w-3/4 max-w-sm h-full bg-white shadow-2xl p-6 flex flex-col gap-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <h3 className="text-lg font-bold text-gray-900"></h3>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                  <X size={24} className="text-gray-600" />
                </button>
              </div>

              {/* User Section */}
              {firebaseUser === undefined ? null : !firebaseUser ? (
                <button
                  type="button"
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition mb-4"
                  onClick={() => {
                    setSignInOpen(true);
                    setMobileMenuOpen(false);
                  }}
                >
                  Login
                </button>
              ) : (
                <div className="w-full px-4 py-3 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full mb-4 flex items-center gap-2">
                  <span className="font-medium">Hi, {firebaseUser.displayName || firebaseUser.email}</span>
                </div>
              )}

              {/* Links */}
              <div className="flex flex-col gap-1">
                <Link 
                  href="/top-selling" 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition text-gray-700 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Top Selling Items
                </Link>
                <Link 
                  href="/new" 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition text-gray-700 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  New Arrivals
                </Link>

                <Link 
                  href="/5-star-rated" 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition text-gray-700 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <StarIcon size={18} className="text-orange-500" fill="#FFA500" />
                  5 Star Rated
                </Link>

                <Link 
                  href="/wishlist" 
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-100 rounded-lg transition text-gray-700 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <HeartIcon size={18} className="text-orange-500" />
                    <span>Wishlist</span>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                <Link 
                  href="/cart" 
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-100 rounded-lg transition text-gray-700 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={18} className="text-blue-600" />
                    <span>Cart</span>
                  </div>
                  {cartCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link 
                  href="/orders" 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition text-gray-700 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <PackageIcon size={18} className="text-gray-600" />
                  <span>My Orders</span>
                </Link>
              </div>

              {/* Support Section */}
              <div className="mt-auto pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-4">Support</p>
                <Link 
                  href="/faq" 
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition text-gray-700 text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQ
                </Link>
                <Link 
                  href="/support" 
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition text-gray-700 text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Support
                </Link>
                <Link 
                  href="/terms" 
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition text-gray-700 text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Terms & Conditions
                </Link>
                <Link 
                  href="/privacy-policy" 
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition text-gray-700 text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Privacy Policy
                </Link>
                <Link 
                  href="/return-policy" 
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition text-gray-700 text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Return Policy
                </Link>
              </div>
            </div>
          </div>
        )}


      {/* Sign In Modal (always at Navbar root) */}
      {!firebaseUser && <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />}
    </div>
  </nav>
  );
};

export default Navbar;
