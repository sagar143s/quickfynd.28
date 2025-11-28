import prisma from "@/lib/prisma";

import { NextResponse } from "next/server";

// Link guest orders to newly created user account
export async function POST(request) {
    try {

        
        if (!userId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

    
        const user = await request.json();
        const { email, phone } = user;

        if (!email && !phone) {
            return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
        }

        // Find guest user by email or phone
        const guestUserFilter = [];
        if (email) guestUserFilter.push({ email: email });
        if (phone) guestUserFilter.push({ phone: phone });

        const guestUser = await prisma.guestUser.findFirst({
            where: {
                OR: guestUserFilter,
                accountCreated: false
            }
        });

        if (!guestUser) {
            return NextResponse.json({ 
                message: "No guest orders found",
                linked: false 
            });
        }

        // Find all guest orders with matching email or phone
        const orderFilter = [];
        if (email) orderFilter.push({ guestEmail: email });
        if (phone) orderFilter.push({ guestPhone: phone });

        const guestOrders = await prisma.order.findMany({
            where: {
                isGuest: true,
                OR: orderFilter
            }
        });

        if (guestOrders.length === 0) {
            return NextResponse.json({ 
                message: "No guest orders found",
                linked: false 
            });
        }

        // Link guest orders to the new user account
        await prisma.order.updateMany({
            where: {
                id: {
                    in: guestOrders.map(order => order.id)
                }
            },
            data: {
                userId: userId,
                isGuest: false
            }
        });

        // Mark guest user account as converted
        await prisma.guestUser.update({
            where: { id: guestUser.id },
            data: {
                accountCreated: true
            }
        });

        return NextResponse.json({ 
            message: `Successfully linked ${guestOrders.length} guest order(s) to your account`,
            linked: true,
            count: guestOrders.length
        });

    } catch (error) {
        console.error("Error linking guest orders:", error);
        return NextResponse.json({ 
            error: error.message || "Failed to link guest orders" 
        }, { status: 500 });
    }
}
