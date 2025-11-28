import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
    try {
        const { message, conversationHistory } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Fetch products and store info for context
        const products = await prisma.product.findMany({
            where: { inStock: true },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                mrp: true,
                category: true,
                inStock: true,
                fastDelivery: true,
                store: {
                    select: {
                        name: true,
                        description: true
                    }
                }
            },
            take: 50 // Limit to prevent token overflow
        });

        // Fetch active coupons
        const coupons = await prisma.coupon.findMany({
            where: {
                isActive: true,
                expiryDate: {
                    gte: new Date()
                }
            },
            select: {
                code: true,
                discount: true,
                discountType: true,
                description: true,
                minPurchase: true,
                forNewUser: true,
                forMember: true
            }
        });

        // Build context for AI
        const systemContext = `You are Qui's friendly shopping assistant. Help customers find products, answer questions about offers, shipping, returns, and provide excellent customer service.

**Available Products (${products.length}):**
${products.map(p => `- ${p.name} (₹${p.price}${p.mrp > p.price ? `, was ₹${p.mrp}` : ''}) - ${p.category}${p.fastDelivery ? ' - Fast Delivery Available' : ''} - Store: ${p.store.name}`).join('\n')}

**Active Offers & Coupons:**
${coupons.length > 0 ? coupons.map(c => 
    `- Code: ${c.code} - ${c.discountType === 'percentage' ? c.discount + '% off' : '₹' + c.discount + ' off'}${c.minPurchase ? ' (Min purchase: ₹' + c.minPurchase + ')' : ''}${c.forNewUser ? ' - New Users Only' : ''}${c.forMember ? ' - Members Only' : ''}`
).join('\n') : 'No active coupons at the moment.'}

**Store Policies:**
- Free shipping on orders above ₹499 (may vary by shipping settings)
- 7-day return and replacement policy on eligible products
- Cash on Delivery (COD) and Online payment available
- Fast delivery available on select products
- Guest checkout available for quick purchases

**Important Guidelines:**
1. Be friendly, helpful, and conversational
2. Recommend products based on customer needs
3. Provide accurate pricing and availability information
4. Explain offers and how to use coupon codes
5. Help with order tracking, returns, and general queries
6. If you don't know something, admit it and suggest contacting support
7. Keep responses concise but informative
8. Use emojis occasionally to be friendly 😊
9. Always mention product prices in ₹ (United Arab Emirates Dirham)
10. Provide product links when relevant: /product/[productId]

Customer Question: ${message}

Respond naturally and helpfully!`;

        // Build conversation history for context
        const conversationContext = conversationHistory && conversationHistory.length > 0
            ? conversationHistory.map(msg => `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}`).join('\n')
            : '';

        const fullPrompt = conversationContext 
            ? `${systemContext}\n\nPrevious Conversation:\n${conversationContext}\n\nCurrent Question: ${message}`
            : systemContext;

        // Generate AI response
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const aiMessage = response.text();

        return NextResponse.json({
            message: aiMessage,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        
        // Handle specific Gemini errors
        if (error.message?.includes('API key')) {
            return NextResponse.json({ 
                error: "AI service configuration error. Please contact support." 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            error: error.message || "Failed to process your message. Please try again." 
        }, { status: 500 });
    }
}
