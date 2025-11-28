// lib/shipping.js
import axios from 'axios';

export async function fetchShippingSettings() {
  const { data } = await axios.get('/api/shipping');
  return data.setting;
}

export function calculateShipping({ cartItems, shippingSetting }) {
  if (!shippingSetting?.enabled) return 0;
  if (shippingSetting.shippingType === 'FLAT_RATE') {
    // Free shipping if subtotal exceeds freeShippingMin
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (shippingSetting.freeShippingMin && subtotal >= shippingSetting.freeShippingMin) return 0;
    return shippingSetting.flatRate;
  }
  if (shippingSetting.shippingType === 'PER_ITEM') {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    let fee = shippingSetting.perItemFee * totalItems;
    if (shippingSetting.maxItemFee) fee = Math.min(fee, shippingSetting.maxItemFee);
    return fee;
  }
  // Add more shipping types as needed
  return 0;
}
