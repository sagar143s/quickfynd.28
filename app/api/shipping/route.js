import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";

import { NextResponse } from "next/server";

// GET: Public - return current shipping settings
export async function GET() {
  try {
    const setting = await prisma.shippingSetting.findUnique({ where: { id: "default" } });
    return NextResponse.json({
      setting: setting || {
        id: "default",
        enabled: true,
        shippingType: "FLAT_RATE",
        flatRate: 5,
        perItemFee: 2,
        maxItemFee: null,
        weightUnit: "kg",
        baseWeight: 1,
        baseWeightFee: 5,
        additionalWeightFee: 2,
        freeShippingMin: 499,
        localDeliveryFee: null,
        regionalDeliveryFee: null,
        estimatedDays: "3-5",
        enableCOD: true,
        codFee: 0,
        enableExpressShipping: false,
        expressShippingFee: 20,
        expressEstimatedDays: "1-2"
      }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// PUT: Seller only - update or create singleton settings
export async function PUT(request) {
  try {
    // Extract userId from Firebase token in Authorization header
    const authHeader = request.headers.get("authorization");
    let userId = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split(" ")[1];
      const { getAuth } = await import("@/lib/firebase-admin");
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (e) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: "not authorized" }, { status: 401 });

    const body = await request.json();
    const data = {
      enabled: Boolean(body.enabled ?? true),
      shippingType: body.shippingType || "FLAT_RATE",
      // Flat Rate
      flatRate: Number(body.flatRate ?? 5),
      // Per Item
      perItemFee: Number(body.perItemFee ?? 2),
      maxItemFee: body.maxItemFee ? Number(body.maxItemFee) : null,
      // Weight Based
      weightUnit: body.weightUnit || "kg",
      baseWeight: Number(body.baseWeight ?? 1),
      baseWeightFee: Number(body.baseWeightFee ?? 5),
      additionalWeightFee: Number(body.additionalWeightFee ?? 2),
      // Free Shipping
      freeShippingMin: Number(body.freeShippingMin ?? 499),
      // Regional
      localDeliveryFee: body.localDeliveryFee ? Number(body.localDeliveryFee) : null,
      regionalDeliveryFee: body.regionalDeliveryFee ? Number(body.regionalDeliveryFee) : null,
      // Delivery Time
      estimatedDays: body.estimatedDays || "3-5",
      // COD
      enableCOD: Boolean(body.enableCOD ?? true),
      codFee: Number(body.codFee ?? 0),
      // Express
      enableExpressShipping: Boolean(body.enableExpressShipping ?? false),
      expressShippingFee: Number(body.expressShippingFee ?? 20),
      expressEstimatedDays: body.expressEstimatedDays || "1-2"
    };

    const setting = await prisma.shippingSetting.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data }
    });
    return NextResponse.json({ setting });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
