import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Mobile from '../assets/HOME/homecategory/mobile.webp'
import Computer from '../assets/HOME/homecategory/computer.webp'
import Fashion from '../assets/HOME/homecategory/fashion.webp'
import Grocerry from '../assets/HOME/homecategory/grocerry.webp'
import Food from '../assets/HOME/homecategory/food.webp'
import Flight from '../assets/HOME/homecategory/flight.webp'
import Tv from '../assets/HOME/homecategory/tv.jpg'
import Furniture from '../assets/HOME/homecategory/furniture.avif'
// badge: "NEW"
const categories = [
  { label: "Fast Delivery", img: Mobile,  },
  { label: "Mobiles & Tablets", img: Mobile },
  { label: "Fashion", img: Fashion },
  { label: "Electronics", img: Computer,  },
  { label: "Home & Furniture", img: Furniture,},
  { label: "TVs & Appliances", img: Tv },
  { label: "Flight Bookings", img: Flight },
  { label: "Beauty, Food..", img: Food,  },
  { label: "Grocery", img: Grocerry },
    { label: "Grocery", img: Grocerry }
];

export default function HomeCategories() {
  const scrollRef = useRef(null);

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -200, behavior: "smooth" });
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
  };

  return (
    // Desktop: arrows hidden, Mobile: arrows visible
    // using hidden md:block or block md:hidden classes as needed
    <div className="relative w-full max-w-[1300px] mx-auto bg-gray-100 py-4 px-2">
      {/* Left Arrow */}
      <button
        className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 bg-white shadow-md rounded-full p-2 z-10"
        onClick={scrollLeft}
      >
        <ChevronLeft />
      </button>

      {/* Scrollable Row */}
      <div
        ref={scrollRef}
        className="flex flex-row items-center justify-start gap-8 overflow-x-auto scrollbar-hide px-10"
      >
        {categories.map((cat, idx) => (
          <div key={cat.label + '-' + idx} className="flex flex-col items-center min-w-[90px]">
            <div className="relative">
              <Image src={cat.img} alt={cat.label} width={56} height={56} className="object-contain" />
              {cat.badge && (
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-blue-600 text-xs text-white px-3 py-1 rounded-full font-bold shadow-md z-50 border-2 border-white">
                  {cat.badge}
                </span>
              )}
            </div>
            <span className="mt-2 text-sm text-center whitespace-nowrap font-medium">
              {cat.label} {cat.hasDropdown && <span>&#9660;</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Right Arrow */}
      <button
        onClick={scrollRight}
        className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 bg-white shadow-md rounded-full p-2 z-10"
      >
        <ChevronRight />
      </button>
    </div>
  );
}
