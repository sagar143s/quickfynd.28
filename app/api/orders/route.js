
import prisma from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from 'crypto';



export async function POST(request) {
    try {
        // Parse and log request
        const headersObj = Object.fromEntries(request.headers.entries());
        let bodyText = '';
        try { bodyText = await request.text(); } catch (err) { bodyText = '[unreadable]'; }
        let body = {};
        try { body = JSON.parse(bodyText); } catch (err) { body = { raw: bodyText }; }
        console.log('ORDER API: Incoming request', { method: request.method, headers: headersObj, body });

        // Extract fields
        const { addressId, items, couponCode, paymentMethod, isGuest, guestInfo } = body;
        let userId = null;
        let isPlusMember = false;

        // Auth for logged-in user
        if (!isGuest) {
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'not authorized' }, { status: 401 });
            }
            const idToken = authHeader.split('Bearer ')[1];
            try {
                const { getAuth } = await import('firebase-admin/auth');
                const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
                if (getApps().length === 0) {
                    initializeApp({ credential: applicationDefault() });
                }
                const decodedToken = await getAuth().verifyIdToken(idToken);
                userId = decodedToken.uid;
                isPlusMember = decodedToken.plan === 'plus';
            } catch (err) {
                return NextResponse.json({ error: 'Token verification failed', details: err?.message || err }, { status: 401 });
            }
        }

        // Validation
        if (isGuest) {
            const missingFields = [];
            if (!guestInfo) missingFields.push('guestInfo');
            else {
                if (!guestInfo.name) missingFields.push('name');
                if (!guestInfo.email) missingFields.push('email');
                if (!guestInfo.phone) missingFields.push('phone');
                if (!guestInfo.address && !guestInfo.street) missingFields.push('address');
                if (!guestInfo.city) missingFields.push('city');
                if (!guestInfo.state) missingFields.push('state');
                if (!guestInfo.country) missingFields.push('country');
            }
            // Extra debug log for guestInfo and missing fields
            console.log('ORDER API DEBUG: guestInfo received:', guestInfo);
            console.log('ORDER API DEBUG: missingFields:', missingFields);
            if (missingFields.length > 0) {
                return NextResponse.json({ error: 'missing guest information', missingFields, guestInfo }, { status: 400 });
            }
            if (!paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
                return NextResponse.json({ error: 'missing order details.', details: { paymentMethod, items }, guestInfo }, { status: 400 });
            }
        } else {
            if (!userId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
                return NextResponse.json({ error: 'missing order details.' }, { status: 400 });
            }
        }

        // Coupon logic
        let coupon = null;
        if (couponCode) {
            coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
            if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 400 });
            if (coupon.forNewUser) {
                const userorders = await prisma.order.findMany({ where: { userId } });
                if (userorders.length > 0) return NextResponse.json({ error: 'Coupon valid for new users' }, { status: 400 });
            }
            if (coupon.forMember && !isPlusMember) {
                return NextResponse.json({ error: 'Coupon valid for members only' }, { status: 400 });
            }
        }

        // Group items by store
        const ordersByStore = new Map();
        let grandSubtotal = 0;
        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.id } });
            if (!product) return NextResponse.json({ error: 'Product not found', id: item.id }, { status: 400 });
            const storeId = product.storeId;
            if (!ordersByStore.has(storeId)) ordersByStore.set(storeId, []);
            ordersByStore.get(storeId).push({ ...item, price: product.price });
            grandSubtotal += Number(product.price) * Number(item.quantity);
        }

        // Shipping (always free)
        let shippingFee = 0;
        let isShippingFeeAdded = false;

        // Order creation
        let orderIds = [];
        let fullAmount = 0;
        for (const [storeId, sellerItems] of ordersByStore.entries()) {
                                                            // Ensure user exists in DB (upsert)
                                                            if (userId) {
                                                                await prisma.user.upsert({
                                                                    where: { id: userId },
                                                                    update: {},
                                                                    create: {
                                                                        id: userId,
                                                                        name: '', // Optionally fetch from Firebase
                                                                        email: '', // Optionally fetch from Firebase
                                                                        image: '',
                                                                        cart: {}
                                                                    }
                                                                });
                                                            }
                                    // Existence checks for user, address, and store
                                    if (userId) {
                                        const userExists = await prisma.user.findUnique({ where: { id: userId } });
                                        if (!userExists) {
                                            return NextResponse.json({ error: 'User not found' }, { status: 400 });
                                        }
                                    }
                                    if (addressId) {
                                        const addressExists = await prisma.address.findUnique({ where: { id: addressId } });
                                        if (!addressExists) {
                                            return NextResponse.json({ error: 'Address not found' }, { status: 400 });
                                        }
                                    }
                                    if (storeId) {
                                        const storeExists = await prisma.store.findUnique({ where: { id: storeId } });
                                        if (!storeExists) {
                                            return NextResponse.json({ error: 'Store not found' }, { status: 400 });
                                        }
                                    }
            let total = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            if (couponCode && coupon) {
                if (coupon.discountType === 'percentage') {
                    total -= (total * coupon.discount) / 100;
                } else {
                    total -= Math.min(coupon.discount, total);
                }
            }
            if (!isPlusMember && !isShippingFeeAdded) {
                total += shippingFee;
                isShippingFeeAdded = true;
            }
            fullAmount += parseFloat(total.toFixed(2));

            // Prepare order data
            const orderData = {
                store: { connect: { id: storeId } },
                total: parseFloat(total.toFixed(2)),
                paymentMethod,
                isCouponUsed: !!coupon,
                coupon: coupon || {},
                orderItems: {
                    create: sellerItems.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            };

            if (isGuest) {
                // Robust upsert for guest user
                await prisma.user.upsert({
                    where: { id: 'guest' },
                    update: {},
                    create: {
                        id: 'guest',
                        name: 'Guest User',
                        email: 'guest@system.local',
                        image: '',
                        cart: []
                    }
                });
                // Only create and assign guest address if address fields are present
                if (guestInfo.address || guestInfo.street) {
                    const guestAddress = await prisma.address.create({
                        data: {
                            userId: 'guest',
                            name: guestInfo.name,
                            email: guestInfo.email,
                            phone: guestInfo.phone,
                            street: guestInfo.address || guestInfo.street,
                            city: guestInfo.city || 'Guest',
                            state: guestInfo.state || 'Guest',
                            zip: guestInfo.zip || '000000',
                            country: guestInfo.country || 'UAE'
                        }
                    });
                    orderData.addressId = guestAddress.id;
                }
                orderData.isGuest = true;
                orderData.guestName = guestInfo.name;
                orderData.guestEmail = guestInfo.email;
                orderData.guestPhone = guestInfo.phone;

                // Upsert guestUser record
                const convertToken = crypto.randomBytes(32).toString('hex');
                const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                await prisma.guestUser.upsert({
                    where: { email: guestInfo.email },
                    update: {
                        name: guestInfo.name,
                        phone: guestInfo.phone,
                        convertToken,
                        tokenExpiry
                    },
                    create: {
                        name: guestInfo.name,
                        email: guestInfo.email,
                        phone: guestInfo.phone,
                        convertToken,
                        tokenExpiry
                    }
                });
            } else {
                                if (typeof userId === 'string' && userId.trim() !== '') {
                                    orderData.user = { connect: { id: userId } };
                                }
                                // Only set address relation if addressId is a non-empty string
                                if (typeof addressId === 'string' && addressId.trim() !== '') {
                                    orderData.address = { connect: { id: addressId } };
                                } else {
                                    delete orderData.address;
                                }
                                // Final sanitization and debug log
                                if (
                                    !orderData.address ||
                                    typeof orderData.address !== 'object' ||
                                    !orderData.address.connect ||
                                    typeof orderData.address.connect.id !== 'string' ||
                                    orderData.address.connect.id.trim() === ''
                                ) {
                                    delete orderData.address;
                                }
                                console.log('FINAL orderData before prisma.order.create:', JSON.stringify(orderData, null, 2));
            }

            // Create order
                                                // FINAL address sanitization: only keep if valid connect.id
                                                if (
                                                    !orderData.address ||
                                                    typeof orderData.address !== 'object' ||
                                                    !orderData.address.connect ||
                                                    typeof orderData.address.connect.id !== 'string' ||
                                                    orderData.address.connect.id.trim() === ''
                                                ) {
                                                    delete orderData.address;
                                                }
                                                console.log('FINAL orderData before prisma.order.create:', JSON.stringify(orderData, null, 2));
                        // Remove address/addressId if empty, null, or invalid
                        // Only keep address if it is a valid connect object with a real id
                        if (
                            !orderData.address ||
                            typeof orderData.address !== 'object' ||
                            !orderData.address.connect ||
                            typeof orderData.address.connect.id !== 'string' ||
                            orderData.address.connect.id.trim() === ''
                        ) {
                            delete orderData.address;
                        }
                        if (
                            !orderData.addressId ||
                            orderData.addressId === ''
                        ) {
                            delete orderData.addressId;
                        }
                        console.log('ORDER API DEBUG: orderData keys:', Object.keys(orderData));
                        console.log('ORDER API DEBUG: orderData before prisma.order.create:', JSON.stringify(orderData, null, 2));
            const order = await prisma.order.create({
                data: orderData,
                include: {
                    user: true,
                    orderItems: { include: { product: true } }
                }
            });
            orderIds.push(order.id);

            // Email notification
            try {
                if (isGuest) {
                    const guestUser = await prisma.guestUser.findUnique({ where: { email: guestInfo.email } });
                    const emailResponse = await fetch(`${request.headers.get('origin')}/api/notifications/guest-order`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: order.id,
                            email: guestInfo.email,
                            customerName: guestInfo.name,
                            orderItems: order.orderItems,
                            total: order.total,
                            convertToken: guestUser?.convertToken
                        })
                    });
                    if (!emailResponse.ok) console.error('Failed to send guest order email');
                } else {
                    const emailResponse = await fetch(`${request.headers.get('origin')}/api/notifications/order-status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: order.id,
                            email: order.user.email,
                            customerName: order.user.name,
                            status: 'ORDER_PLACED',
                            orderItems: order.orderItems
                        })
                    });
                    if (!emailResponse.ok) console.error('Failed to send order confirmation email');
                }
            } catch (emailError) {
                console.error('Error sending order confirmation email:', emailError);
            }
        }

        // Coupon usage count
        if (couponCode && coupon) {
            await prisma.coupon.update({
                where: { code: couponCode },
                data: { usedCount: { increment: 1 } }
            });
        }

        // Stripe payment
        if (paymentMethod === 'STRIPE') {
            const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
            const origin = await request.headers.get('origin');
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'aed',
                        product_data: { name: 'Order' },
                        unit_amount: Math.round(fullAmount * 100)
                    },
                    quantity: 1
                }],
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
                mode: 'payment',
                success_url: `${origin}/loading?nextUrl=orders`,
                cancel_url: `${origin}/cart`,
                metadata: {
                    orderIds: orderIds.join(','),
                    userId,
                    appId: 'Qui'
                }
            });
            return NextResponse.json({ session });
        }

        // Clear cart for logged-in users
        if (userId) {
            await prisma.user.update({ where: { id: userId }, data: { cart: {} } });
        }

        // Return orders
        if (isGuest) {
            const orders = await prisma.order.findMany({
                where: { id: { in: orderIds } },
                include: { user: true, orderItems: { include: { product: true } } }
            });
            return NextResponse.json({ message: 'Orders Placed Successfully', orders, id: orders[0]?.id });
        } else {
            // Return the last order (for user)
            const order = await prisma.order.findUnique({
                where: { id: orderIds[orderIds.length - 1] },
                include: { user: true, orderItems: { include: { product: true } } }
            });
            return NextResponse.json({ message: 'Orders Placed Successfully', order, id: order.id });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// Get all orders for a user
export async function GET(request) {
    try {
        // Firebase Auth: Extract token from Authorization header
        const authHeader = request.headers.get('authorization');
        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            const { getAuth } = await import('firebase-admin/auth');
            const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
            if (getApps().length === 0) {
                initializeApp({ credential: applicationDefault() });
            }
            try {
                const decodedToken = await getAuth().verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (e) {
                // Not signed in, userId remains null
            }
        }
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const orders = await prisma.order.findMany({
            where: {userId, OR: [
                {paymentMethod: PaymentMethod.COD},
                {AND: [{paymentMethod: PaymentMethod.STRIPE}, {isPaid: true}]}
            ]},
            include: {
                orderItems: {include: {product: true}},
                address: true
            },
            orderBy: {createdAt: 'desc'}
        })

        return NextResponse.json({orders})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}