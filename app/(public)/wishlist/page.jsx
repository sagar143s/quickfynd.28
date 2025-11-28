'use client'
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { HeartIcon, ShoppingCartIcon, TrashIcon, StarIcon, CheckCircle2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { addToCart } from "@/lib/features/cart/cartSlice";
import PageTitle from "@/components/PageTitle";
import Loading from "@/components/Loading";



function WishlistAuthed() {
    const { user, isSignedIn } = useAuth();
    const userId = user?.uid;
    const router = useRouter();
    const dispatch = useDispatch();
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        if (!isSignedIn) {
            router.push('/sign-in?redirect_to=/wishlist');
            return;
        }
        fetchWishlist();
    }, [isSignedIn]);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/wishlist');
            setWishlist(data.wishlist);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeFromWishlist = async (productId) => {
        try {
            await axios.post('/api/wishlist', {
                productId,
                action: 'remove'
            });
            setWishlist(wishlist.filter(item => item.productId !== productId));
            setSelectedItems(selectedItems.filter(id => id !== productId));
            
            // Dispatch event to update navbar count
            window.dispatchEvent(new Event('wishlistUpdated'));
        } catch (error) {
            console.error('Error removing from wishlist:', error);
        }
    };

    const handleAddToCart = (product) => {
        dispatch(addToCart({
            product,
            userId,
            user: {
                name: user?.displayName,
                email: user?.email,
                image: user?.photoURL
            }
        }));
    };

    const toggleSelectItem = (productId) => {
        setSelectedItems(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const selectAllItems = () => {
        if (selectedItems.length === wishlist.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(wishlist.map(item => item.productId));
        }
    };

    const addSelectedToCart = async () => {
        if (selectedItems.length === 0) return;
        
        setAddingToCart(true);
        try {
            selectedItems.forEach(productId => {
                const item = wishlist.find(w => w.productId === productId);
                if (item) {
                    handleAddToCart(item.product);
                }
            });
            
            // Show success message
            alert(`Added ${selectedItems.length} item(s) to cart!`);
            
            // Optionally redirect to cart
            // router.push('/cart');
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Failed to add some items to cart');
        } finally {
            setAddingToCart(false);
        }
    };

    const calculateTotal = () => {
        return selectedItems.reduce((total, productId) => {
            const item = wishlist.find(w => w.productId === productId);
            return total + (item?.product?.price || 0);
        }, 0);
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <PageTitle title="My Wishlist" />

            {wishlist.length === 0 ? (
                <div className="text-center py-16">
                    <HeartIcon size={64} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Your wishlist is empty</h2>
                    <p className="text-gray-600 mb-6">Start adding products you love!</p>
                    <button
                        onClick={() => router.push('/shop')}
                        className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
                    >
                        Browse Products
                    </button>
                </div>
            ) : (
                <div className="flex gap-6">
                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    {wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'}
                                </h2>
                                <button
                                    onClick={selectAllItems}
                                    className="text-sm text-orange-500 hover:underline font-medium"
                                >
                                    {selectedItems.length === wishlist.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {wishlist.map((item) => {
                                const product = item.product;
                                const averageRating = product.rating?.length
                                    ? product.rating.reduce((acc, r) => acc + r.rating, 0) / product.rating.length
                                    : 0;
                                const isSelected = selectedItems.includes(item.productId);

                                return (
                                    <div 
                                        key={item.id} 
                                        className={`bg-white border-2 rounded-lg overflow-hidden hover:shadow-lg transition-all group relative ${
                                            isSelected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'
                                        }`}
                                    >
                                        {/* Selection Checkbox */}
                                        <div className="absolute top-3 left-3 z-10">
                                            <button
                                                onClick={() => toggleSelectItem(item.productId)}
                                                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                                    isSelected 
                                                        ? 'bg-orange-500 border-orange-500' 
                                                        : 'bg-white border-gray-300 hover:border-orange-500'
                                                }`}
                                            >
                                                {isSelected && <CheckCircle2 size={20} className="text-white" />}
                                            </button>
                                        </div>

                                        {/* Product Image */}
                                        <div className="relative aspect-square bg-gray-50">
                                            <Image
                                                src={product.images[0]}
                                                alt={product.name}
                                                fill
                                                className="object-contain p-4 group-hover:scale-105 transition cursor-pointer"
                                                onClick={() => router.push(`/product/${product.slug}`)}
                                            />
                                            {/* Remove Button */}
                                            <button
                                                onClick={() => removeFromWishlist(product.id)}
                                                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-red-50 transition shadow-lg"
                                            >
                                                <TrashIcon size={18} className="text-red-500" />
                                            </button>
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-4">
                                            <h3 
                                                className="font-semibold text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-orange-500"
                                                onClick={() => router.push(`/product/${product.slug}`)}
                                            >
                                                {product.name}
                                            </h3>

                                            {/* Rating */}
                                            {product.rating?.length > 0 && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded">
                                                        <StarIcon size={14} fill="#FFA500" className="text-orange-500" />
                                                        <span className="text-xs font-semibold">{averageRating.toFixed(1)}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">({product.rating.length})</span>
                                                </div>
                                            )}

                                            {/* Price */}
                                            <div className="flex items-baseline gap-2 mb-4">
                                                <span className="text-xl font-bold text-gray-900">₹{product.price}</span>
                                                {product.mrp > product.price && (
                                                    <span className="text-sm text-gray-400 line-through">₹{product.mrp}</span>
                                                )}
                                            </div>

                                            {/* Add to Cart Button */}
                                            <button
                                                onClick={() => {
                                                    handleAddToCart(product);
                                                    alert('Added to cart!');
                                                }}
                                                className="w-full bg-orange-500 text-white py-2.5 rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2 font-medium"
                                            >
                                                <ShoppingCartIcon size={18} />
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar - Checkout Section */}
                    {wishlist.length > 0 && (
                        <div className="hidden lg:block w-80 flex-shrink-0">
                            <div className="sticky top-4 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    Wishlist Summary
                                </h3>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total Items:</span>
                                        <span className="font-semibold">{wishlist.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Selected Items:</span>
                                        <span className="font-semibold text-orange-500">{selectedItems.length}</span>
                                    </div>
                                    <hr />
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-900">Total Amount:</span>
                                        <span className="font-bold text-xl text-gray-900">₹{calculateTotal().toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={addSelectedToCart}
                                    disabled={selectedItems.length === 0 || addingToCart}
                                    className={`w-full py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                                        selectedItems.length === 0 
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                            : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl'
                                    }`}
                                >
                                    <ShoppingCartIcon size={20} />
                                    {addingToCart ? 'Adding...' : `Add ${selectedItems.length > 0 ? selectedItems.length : ''} to Cart`}
                                </button>

                                {selectedItems.length === 0 && (
                                    <p className="text-xs text-gray-500 text-center mt-3">
                                        Select items to add them to cart
                                    </p>
                                )}

                                {selectedItems.length > 0 && (
                                    <button
                                        onClick={() => router.push('/cart')}
                                        className="w-full mt-3 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition"
                                    >
                                        View Cart
                                    </button>
                                )}

                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Benefits:</h4>
                                    <ul className="space-y-2 text-xs text-gray-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">✓</span>
                                            <span>Free shipping on orders above ₹499</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">✓</span>
                                            <span>Easy returns within 7 days</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">✓</span>
                                            <span>Secure payment options</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Sticky Bottom Bar */}
            {wishlist.length > 0 && selectedItems.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-4 z-40">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-xs text-gray-600">{selectedItems.length} items selected</p>
                            <p className="text-lg font-bold text-gray-900">₹{calculateTotal().toFixed(2)}</p>
                        </div>
                        <button
                            onClick={addSelectedToCart}
                            disabled={addingToCart}
                            className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition flex items-center gap-2"
                        >
                            <ShoppingCartIcon size={18} />
                            {addingToCart ? 'Adding...' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WishlistPage() {
    return <WishlistAuthed />;
}
