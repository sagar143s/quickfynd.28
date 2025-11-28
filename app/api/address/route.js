import prisma from "@/lib/prisma";
import { getAuth } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

// Add new address
export async function POST(request){
    try {
        // Firebase Auth: get Bearer token from header
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.split(" ")[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = decodedToken.uid;

        // Ensure user exists in User table, create if missing
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            // Try to get user info from token, fallback to placeholders
            const name = decodedToken.name || "User";
            const email = decodedToken.email || `${userId}@noemail.com`;
            const image = decodedToken.picture || "";
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name,
                    email,
                    image
                }
            });
        }

        const { address } = await request.json();
        address.userId = userId;

        const newAddress = await prisma.address.create({
            data: address
        });

        return NextResponse.json({ newAddress, message: 'Address added successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// Get all addresses for a user
export async function GET(request){
    try {
        // Firebase Auth: get Bearer token from header
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.split(" ")[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = decodedToken.uid;

        const addresses = await prisma.address.findMany({
            where: { userId }
        });

        return NextResponse.json({ addresses });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}