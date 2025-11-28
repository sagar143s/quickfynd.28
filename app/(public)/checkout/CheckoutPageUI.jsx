"use client";

import React, { useState, useEffect } from "react";
import { countryCodes } from "@/assets/countryCodes";
import { indiaStatesAndDistricts } from "@/assets/indiaStatesAndDistricts";
import { useSelector, useDispatch } from "react-redux";
import { fetchAddress } from "@/lib/features/address/addressSlice";
import { clearCart } from "@/lib/features/cart/cartSlice";
import { fetchShippingSettings, calculateShipping } from "@/lib/shipping";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import dynamic from "next/dynamic";

const SignInModal = dynamic(() => import("@/components/SignInModal"), { ssr: false });
const AddressModal = dynamic(() => import("@/components/AddressModal"), { ssr: false });

export default function CheckoutPage() {
  const { user, loading: authLoading, getToken } = useAuth();
  const dispatch = useDispatch();
  const addressList = useSelector((state) => state.address?.list || []);
  const addressFetchError = useSelector((state) => state.address?.error);
  const { cartItems } = useSelector((state) => state.cart);
  const products = useSelector((state) => state.product.list);

  const [form, setForm] = useState({
    addressId: "",
    payment: "cod",
    phoneCode: '+91',
    country: 'India',
    state: 'Kerala',
    district: '',
    street: '',
    city: '',
    pincode: '',
    name: '',
    email: '',
    phone: '',
  });

  // For India state/district dropdowns
  const keralaDistricts = indiaStatesAndDistricts.find(s => s.state === 'Kerala')?.districts || [];
  const [districts, setDistricts] = useState(keralaDistricts);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [shippingSetting, setShippingSetting] = useState(null);
  const [shipping, setShipping] = useState(0);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Coupon logic
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!coupon.trim()) {
      setCouponError("Enter a coupon code to see discount.");
      return;
    }
    setCouponError("");
    // TODO: Add real coupon validation logic here
  };

  useEffect(() => {
    if (!authLoading && !user) {
      setShowSignIn(true);
    }
  }, [authLoading, user]);
  const router = useRouter();

  // Fetch addresses for logged-in users
  useEffect(() => {
    if (user && getToken) {
      dispatch(fetchAddress({ getToken }));
    }
  }, [user, getToken, dispatch]);

  // Auto-select first address
  useEffect(() => {
    if (user && addressList.length > 0 && !form.addressId) {
      setForm((f) => ({ ...f, addressId: addressList[0].id }));
    }
  }, [user, addressList, form.addressId]);

  // Build cart array
  const cartArray = [];
  for (const [key, value] of Object.entries(cartItems || {})) {
    const product = products?.find((p) => String(p.id) === String(key));
    if (product) cartArray.push({ ...product, quantity: value });
  }

  const subtotal = cartArray.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + shipping;

  // Fixed shipping logic: always 25
  useEffect(() => {
    if (subtotal > 0) {
      setShipping(25);
    } else {
      setShipping(0);
    }
  }, [subtotal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'state') {
      // Update districts when state changes
      const stateObj = indiaStatesAndDistricts.find(s => s.state === value);
      setDistricts(stateObj ? stateObj.districts : []);
      setForm(f => ({ ...f, state: value, district: '' }));
    } else if (name === 'country') {
      setForm(f => ({ ...f, country: value, state: '', district: '' }));
      if (value !== 'India') setDistricts([]);
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const [formError, setFormError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    // Validate required fields
    if (cartArray.length === 0) {
      setFormError("Your cart is empty.");
      return;
    }
    setPlacingOrder(true);
    try {
      let addressId = form.addressId;
      // If logged in and no address selected, auto-save the filled form as a new address
      if (user && !addressId) {
        if (!form.name || !form.email || !form.phone || !form.street || !form.city || !form.state || !form.country) {
          setFormError("Please fill all required shipping details.");
          setPlacingOrder(false);
          return;
        }
        const token = await getToken();
        const addressPayload = {
          name: form.name,
          email: form.email,
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.pincode,
          country: form.country,
          phone: form.phone,
          phoneCode: form.phoneCode || '+91',
        };
        if (form.district && form.district.trim() !== "") {
          addressPayload.district = form.district;
        }
        const res = await fetch('/api/address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ address: addressPayload }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          let msg = errorText;
          try {
            const data = JSON.parse(errorText);
            msg = data.message || data.error || errorText;
          } catch {}
          setFormError(msg);
          setPlacingOrder(false);
          return;
        }
        const data = await res.json();
        addressId = data.newAddress.id;
        setForm(f => ({ ...f, addressId }));
        dispatch(fetchAddress({ getToken }));
      }
      // Validate payment method
      if (user && !form.payment) {
        setFormError("Please select a payment method.");
        setPlacingOrder(false);
        return;
      }
      if (!user) {
        if (!form.name || !form.email || !form.phone || !form.street || !form.city || !form.state || !form.country) {
          setFormError("Please fill all required shipping details.");
          setPlacingOrder(false);
          return;
        }
        if (!form.payment) {
          setFormError("Please select a payment method.");
          setPlacingOrder(false);
          return;
        }
      }
      // Build order payload
      let payload;
      if (user) {
        payload = {
          addressId: addressId || (addressList[0] && addressList[0].id),
          items: cartArray.map(({ id, quantity }) => ({ id, quantity })),
          paymentMethod: form.payment === 'cod' ? 'COD' : form.payment.toUpperCase(),
        };
      } else {
        payload = {
          isGuest: true,
          guestInfo: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: form.street,
            city: form.city,
            state: form.state,
            country: form.country || 'UAE',
          },
          items: cartArray.map(({ id, quantity }) => ({ id, quantity })),
          paymentMethod: form.payment === 'cod' ? 'COD' : form.payment.toUpperCase(),
        };
      }
      let fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      };
      if (user && getToken) {
        const token = await getToken();
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      const res = await fetch("/api/orders", fetchOptions);
      if (!res.ok) {
        const errorText = await res.text();
        let msg = errorText;
        try {
          const data = JSON.parse(errorText);
          msg = data.message || data.error || errorText;
        } catch {}
        setFormError(msg);
        setPlacingOrder(false);
        return;
      }
      const data = await res.json();
      dispatch(clearCart());
      router.push(`/order-success?orderId=${data.id}`);
    } catch (err) {
      setFormError(err.message || "Order failed. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (authLoading) return null;
  if (!user) {
    return <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />;
  }
  if (!cartItems || !products) {
    return <div className="text-red-600 font-bold">Redux store not initialized: cart or products missing</div>;
  }

  return (
    <div className="py-10 bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: address, form, payment */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            {/* Cart Items Section */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2 text-gray-900">Cart Items</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cartArray.map((item) => (
                  <div key={item.id} className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-3 gap-3">
                    <img src={item.image || item.images?.[0] || '/placeholder.png'} alt={item.name} className="w-14 h-14 object-cover rounded-md border" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 truncate">{item.brand || ''}</div>
                      <div className="text-xs text-gray-400">₹ {item.price.toLocaleString()}</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <button type="button" className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => {
                          if (item.quantity > 1) {
                            dispatch({ type: 'cart/removeFromCart', payload: { productId: item.id } });
                          }
                        }}>-</button>
                        <span className="px-2 text-sm">{item.quantity}</span>
                        <button type="button" className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => {
                          dispatch({ type: 'cart/addToCart', payload: { productId: item.id } });
                        }}>+</button>
                      </div>
                      <button type="button" className="text-xs text-red-500 hover:underline mt-1" onClick={() => {
                        dispatch({ type: 'cart/deleteItemFromCart', payload: { productId: item.id } });
                      }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Shipping Method Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2 text-gray-900">Choose Shipping Method</h2>
              {/* Only one shipping method for now, auto-selected */}
              <div className="border border-green-400 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-green-900">{shipping === 0 ? 'Free Shipping' : 'Standard Shipping'}</div>
                  <div className="text-xs text-gray-600">Delivered within {shippingSetting?.estimatedDays || '2-5'} business days</div>
                </div>
                <div className="font-bold text-green-900 text-lg">{shipping === 0 ? 'Free' : `₹ ${shipping.toLocaleString()}`}</div>
              </div>
            </div>
            {/* Shipping Details Section */}
            <form id="checkout-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
              {formError && <div className="text-red-600 font-semibold mb-2">{formError}</div>}
              <h2 className="text-xl font-bold mb-2 text-gray-900">Shipping details</h2>
              {/* ...existing code for address/guest form... */}
              {/* Show address fetch error if present */}
              {addressFetchError && (
                <div className="text-red-600 font-semibold mb-2">
                  {addressFetchError === 'Unauthorized' ? (
                    <>
                      You are not logged in or your session expired. <button className="underline text-blue-600" type="button" onClick={() => setShowSignIn(true)}>Sign in again</button>.
                    </>
                  ) : addressFetchError}
                </div>
              )}
              {addressList.length > 0 && !showAddressModal && !addressFetchError ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-900">{addressList[0].name}</div>
                    <div className="text-blue-700 text-sm">{addressList[0].district || addressList[0].city}</div>
                    <div className="text-gray-800 text-sm">{addressList[0].street}</div>
                    <div className="text-gray-800 text-sm">{addressList[0].city}, {addressList[0].state}, {addressList[0].country}</div>
                    <div className="text-orange-500 text-sm font-semibold">{addressList[0].phoneCode} {addressList[0].phone}</div>
                    <div className="flex flex-col gap-1 mt-2 text-xs text-gray-700">
                      <span>Total: <span className="font-bold">₹ {subtotal.toLocaleString()}</span></span>
                      <span className="text-gray-500">Delivery charge: <span className="font-bold">₹ {shipping.toLocaleString()}</span></span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button type="button" className="text-blue-600 text-xs font-semibold hover:underline" onClick={() => setShowAddressModal(true)}>
                      Change address
                    </button>
                    <button type="button" className="text-blue-600 text-xs font-semibold hover:underline" onClick={() => setShowAddressModal(true)}>
                      Add new address
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mb-4">
                  {/* ...existing code for guest/inline address form... */}
                  {/* Name */}
                  <input
                    className="border border-gray-200 bg-white rounded px-4 py-2 focus:border-gray-400"
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={form.name || ''}
                    onChange={handleChange}
                    required
                  />
                  {/* Phone input */}
                  <div className="flex gap-2">
                    <select
                      className="border border-gray-200 bg-white rounded px-2 py-2 focus:border-gray-400"
                      name="phoneCode"
                      value={form.phoneCode}
                      onChange={handleChange}
                      style={{ maxWidth: '110px' }}
                      required
                    >
                      {countryCodes.map((c) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                    <input
                      className="border border-gray-200 bg-white rounded px-4 py-2 flex-1 focus:border-gray-400"
                      type="tel"
                      name="phone"
                      placeholder="Phone number"
                      value={form.phone || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  {/* Email (optional) */}
                  <input
                    className="border border-gray-200 bg-white rounded px-4 py-2 focus:border-gray-400"
                    type="email"
                    name="email"
                    placeholder="Email address (optional)"
                    value={form.email || ''}
                    onChange={handleChange}
                  />
                  {/* Pincode */}
                  <input
                    className="border border-gray-200 bg-white rounded px-4 py-2 focus:border-gray-400"
                    type="text"
                    name="pincode"
                    placeholder="Pincode"
                    value={form.pincode || ''}
                    onChange={handleChange}
                    required={form.country === 'India'}
                  />
                  {/* City */}
                  <input
                    className="border border-gray-200 bg-white rounded px-4 py-2 focus:border-gray-400"
                    type="text"
                    name="city"
                    placeholder="City"
                    value={form.city || ''}
                    onChange={handleChange}
                    required
                  />
                  {/* District dropdown (for India) */}
                  {form.country === 'India' && (
                    <select
                      className="border border-gray-200 bg-white rounded px-4 py-2 focus:border-gray-400"
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      required={!!form.state}
                      disabled={!form.state}
                    >
                      <option value="">Select District</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                  {/* Full Address Line (street) */}
                  <input
                    className="border border-gray-200 bg-white rounded px-4 py-2 focus:border-gray-400"
                    type="text"
                    name="street"
                    placeholder="Full Address Line (Street, Building, Apartment)"
                    value={form.street || ''}
                    onChange={handleChange}
                    required
                  />
                  {/* State dropdown (all states, default Kerala) */}
                  <select
                    className="border border-gray-200 bg-white rounded px-4 py-2 focus:border-gray-400"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select State</option>
                    {indiaStatesAndDistricts.map((s) => (
                      <option key={s.state} value={s.state}>{s.state}</option>
                    ))}
                  </select>
                  {/* Country dropdown (default India) */}
                  <select
                    className="border border-gray-200 bg-white rounded px-4 py-2 focus:border-gray-400"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    required
                  >
                    <option value="India">India</option>
                    {countryCodes.filter(c => c.label !== 'India').map((c) => (
                      <option key={c.label} value={c.label.replace(/ \(.*\)/, '')}>{c.label.replace(/ \(.*\)/, '')}</option>
                    ))}
                  </select>
                </div>
              )}
              <h2 className="text-xl font-bold mb-2 text-gray-900">Payment methods</h2>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={form.payment === 'cod'}
                    onChange={handleChange}
                    className="accent-red-600 w-5 h-5"
                  />
                  <span className="font-semibold text-gray-900">Cash on Delivery</span>
                </label>
                {/* Add more payment methods here if needed */}
              </div>
            </form>
          </div>
        </div>
        {/* Right column: discount input, order summary and place order button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 h-fit flex flex-col justify-between">
          {/* Discount/Coupon input */}
          <form onSubmit={handleApplyCoupon} className="mb-4 flex gap-2">
            <input
              type="text"
              className="border border-gray-200 rounded px-3 py-2 flex-1 focus:border-gray-400"
              placeholder="Discount code or coupon"
              value={coupon}
              onChange={e => setCoupon(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
            >
              Apply
            </button>
          </form>
          {couponError && <div className="text-red-500 text-xs mb-2">{couponError}</div>}
          <h2 className="font-bold text-lg mb-2 text-gray-900">Order details</h2>
          <div className="flex justify-between text-sm text-gray-900 mb-2">
            <span>Items</span>
            <span>₹ {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-900 mb-2">
            <span>Shipping &amp; handling</span>
            <span>{shipping > 0 ? `₹ ${shipping.toLocaleString()}` : '₹ 0'}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold text-base text-gray-900 mb-4">
            <span>Total</span>
            <span>₹ {total.toLocaleString()}</span>
          </div>
          <button
            type="submit"
            form="checkout-form"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded text-lg transition"
            disabled={placingOrder}
          >
            {placingOrder ? "Placing order..." : "Place order"}
          </button>
        </div>
      </div>
      <AddressModal open={showAddressModal} setShowAddressModal={setShowAddressModal} onAddressAdded={(addr) => {
        setForm(f => ({ ...f, addressId: addr.id }));
        dispatch(fetchAddress({ getToken }));
      }} />
    </div>
  );
}