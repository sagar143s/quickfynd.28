'use client'
import BestSelling from "@/components/BestSelling";
import KeywordPills from "@/components/KeywordPills";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import BannerSlider from "@/components/BannerSlider";
import HomeCategories from "@/components/HomeCategories";
import OriginalBrands from "@/components/OriginalBrands";
import ProductGridSection from "@/components/ProductGridSection";
import QuickFyndCategoryDirectory from "@/components/QuickFyndCategoryDirectory";

import HomeDealsSection from "@/components/HomeDealsSection";
import BrandDirectory from "@/components/BrandDirectory";
import ProductSection from "@/components/ProductSection";
import { useSelector } from "react-redux";
import { useMemo, useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
    const products = useSelector(state => state.product.list);
    const [adminSections, setAdminSections] = useState([]);
    const [gridSections, setGridSections] = useState([]);

    useEffect(() => {
        fetchAdminSections();
        // Fetch grid config on mount
        axios.get('/api/admin/grid-products').then(res => {
            setGridSections(Array.isArray(res.data.sections) ? res.data.sections : []);
        });
    }, []);

    const fetchAdminSections = async () => {
        try {
            const { data } = await axios.get('/api/admin/home-sections');
            setAdminSections(data.sections || []);
        } catch (error) {
            console.error('Error fetching admin sections:', error);
        }
    };

    // Create sections from admin data
    const curatedSections = useMemo(() => {
        return adminSections.map(section => {
            // Get products by IDs if specified
            let sectionProducts = section.productIds?.length > 0
                ? products.filter(p => section.productIds.includes(p.id))
                : products;

            // Filter by category if specified
            if (section.category) {
                sectionProducts = sectionProducts.filter(p => p.category === section.category);
            }

            return {
                title: section.section,
                products: sectionProducts,
                viewAllLink: section.category ? `/shop?category=${section.category}` : '/shop'
            };
        });
    }, [adminSections, products]);

    // Fallback: Create sections based on categories if no admin sections
    const categorySections = useMemo(() => {
        if (adminSections.length > 0) return [];
        
        const categories = [...new Set(products.map(p => (p.category || '').toLowerCase()))];

        return categories.slice(0, 4).map(category => ({
            title: `Top Deals on ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            products: products.filter(p => (p.category || '').toLowerCase() === category),
            viewAllLink: `/shop?category=${category}`
        }));
    }, [products, adminSections]);

    const sections = curatedSections.length > 0 ? curatedSections : categorySections;

    // Prepare grid sections with product details
    const gridSectionsWithProducts = gridSections.map(section => ({
        ...section,
        products: (section.productIds || []).map(pid => products.find(p => p.id === pid)).filter(Boolean)
    }));
    // Only show grid if at least one section has a title and products
    const showGrid = gridSectionsWithProducts.some(s => s.title && s.products && s.products.length > 0);

    return (
                <>
                        <div>
                    
                            <HomeCategories/>
                                <Hero />
                                <LatestProducts />
                                {/* <BestSelling /> */}
                                <BannerSlider/>
                                {/* 3 grid sections, max width 1300px, 4 products each, with arrow button */}
                                <div className="max-w-[1300px] mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {gridSections.slice(0, 3).map((section, idx) => (
                                        section && section.title && section.productIds && section.productIds.length > 0 ? (
                                            <ProductGridSection
                                                key={idx}
                                                title={section.title}
                                                products={section.productIds.slice(0, 4).map(pid => products.find(p => p.id === pid)).filter(Boolean)}
                                                viewAllPath={section.path || '#'}
                                            />
                                        ) : null 

                                    ))}
                                </div>
                                <OriginalBrands/>
                                <QuickFyndCategoryDirectory/>
                                                            <KeywordPills />

                                {/* <OurSpecs /> */}
                                {/* <Newsletter /> */}
                                {/* <BrandDirectory/> */}
                        </div>
                </>
    );
}
