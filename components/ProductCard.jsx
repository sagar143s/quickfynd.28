"use client";
import { useAuth } from "@/lib/useAuth";
import { ShoppingCartIcon, StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart } from '@/lib/features/cart/cartSlice'
import { uploadCart } from '@/lib/features/cart/cartSlice'

import toast from 'react-hot-toast'

const ProductCard = ({ product }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'AED'
    const dispatch = useDispatch()
    const { getToken } = useAuth()
    const cartItems = useSelector(state => state.cart.cartItems)
    const itemQuantity = cartItems[product.id] || 0

    const rating = product.rating?.length > 0 
        ? Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / product.rating.length)
        : 0

    // Calculate discount percentage
    const discount = product.mrp && product.mrp > product.price
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
        : 0

    const handleAddToCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        dispatch(addToCart({ productId: product.id }))
        dispatch(uploadCart({ getToken }))
        toast.success('Added to cart')
    }

    // Limit product name to 50 characters
    const displayName = product.name.length > 50 ? product.name.slice(0, 50) + '…' : product.name;

    return (
        <Link href={`/product/${product.slug}`} className='group w-full relative'>
            <div className='bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col relative h-full min-h-[160px] md:min-h-[200px]'>
                {/* Product Image */}
                <div className='relative w-full aspect-square bg-gray-50 overflow-hidden'>
                    {product.fastDelivery && (
                        <span className='absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10'>
                            Fast Delivery
                        </span>
                    )}
                    <Image
                        src={
                            product.images && Array.isArray(product.images) && product.images[0] && typeof product.images[0] === 'string' && product.images[0].trim() !== ''
                                ? product.images[0]
                                : 'https://ik.imagekit.io/jrstupuke/placeholder.png'
                        }
                        alt={product.name}
                        fill
                        className='object-cover transition-transform duration-500 group-hover:scale-105'
                        onError={(e) => {
                            if (e.currentTarget.src !== 'https://ik.imagekit.io/jrstupuke/placeholder.png') {
                                e.currentTarget.src = 'https://ik.imagekit.io/jrstupuke/placeholder.png';
                            }
                        }}
                    />
                    {product.isNew && (
                        <span className='absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10'>
                            NEW
                        </span>
                    )}
                    {discount > 0 && (
                        <span className={`absolute top-2 right-2 ${discount >= 50 ? 'bg-green-500' : 'bg-orange-500'} text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10`}>
                            {discount}% OFF
                        </span>
                    )}
                </div>

                {/* Product Details */}
                <div className='p-2 md:p-4 flex flex-col gap-1 md:gap-2 text-left'>
                    <p className='font-bold text-gray-900 text-base md:text-lg truncate'>{displayName}</p>
                    {/* Ratings - No Border */}
                    <div className='flex items-center gap-1 mt-1'>
                        {product.ratingCount > 0 ? (
                            <>
                                {Array(5).fill('').map((_, index) => (
                                    <StarIcon
                                        key={index}
                                        size={13}
                                        className='text-yellow-500'
                                        fill={product.averageRating >= index + 1 ? "#EAB308" : "none"}
                                        stroke={product.averageRating >= index + 1 ? "#EAB308" : "#D1D5DB"}
                                        strokeWidth={1.5}
                                    />
                                ))}
                                <span className='text-xs text-gray-500 ml-1'>({product.ratingCount})</span>
                            </>
                        ) : (
                            <span className='text-xs text-gray-400 ml-1'>No reviews</span>
                        )}
                    </div>
                    {/* Price */}
                    <div className='flex items-center gap-2 mt-1'>
                        <p className='text-base md:text-xl font-extrabold text-gray-900'>{currency}{product.price}</p>
                        {product.mrp && product.mrp > product.price && (
                            <p className='text-xs md:text-sm text-gray-500 line-through'>{currency}{product.mrp}</p>
                        )}
                    </div>
                </div>
                {/* Cart Button with Badge - Bottom Right */}
                <button 
                    onClick={handleAddToCart}
                    className='absolute bottom-2 right-2 md:bottom-4 md:right-4 w-9 h-9 md:w-10 md:h-10 bg-slate-700 hover:bg-slate-900 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer z-10'
                >
                    <ShoppingCartIcon className='text-white' size={16} />
                    {itemQuantity > 0 && (
                        <span className='absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md'>
                            {itemQuantity}
                        </span>
                    )}
                </button>
            </div>
        </Link>
    )
}

export default ProductCard

