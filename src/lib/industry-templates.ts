import { Category } from "./types";

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  iconName: string;
  categories: {
    name: string;
    codePrefix: string;
    defaultGstRate: number;
    hsnCode: string;
    description?: string;
  }[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: "retail_supermarket",
    name: "General Retail & Supermarket",
    description: "Groceries, kirana, dairy, packaged foods, beverages, and daily FMCG essentials",
    iconName: "ShoppingCart",
    categories: [
      { name: "Food Grains, Pulses & Flour", codePrefix: "GRAIN", defaultGstRate: 5.0, hsnCode: "1006", description: "Basmati rice, wheat, dal, atta, besan" },
      { name: "Dairy, Milk & Farm Fresh", codePrefix: "DAIRY", defaultGstRate: 5.0, hsnCode: "0401", description: "Milk, paneer, curd, butter, ghee, cheese" },
      { name: "Packaged Snacks, Biscuits & Namkeen", codePrefix: "FMCG", defaultGstRate: 12.0, hsnCode: "1905", description: "Biscuits, cookies, namkeen, wafers, noodles" },
      { name: "Cooking Oils & Ghee", codePrefix: "OIL", defaultGstRate: 5.0, hsnCode: "1512", description: "Mustard oil, sunflower oil, refined oil, desi ghee" },
      { name: "Beverages, Cold Drinks & Juices", codePrefix: "BEV", defaultGstRate: 12.0, hsnCode: "2202", description: "Juices, soft drinks, tea, coffee, mineral water" },
      { name: "Personal Care & Toiletries", codePrefix: "CARE", defaultGstRate: 18.0, hsnCode: "3304", description: "Soaps, shampoos, dental care, shaving items" },
      { name: "Home Cleaning & Detergents", codePrefix: "CLEAN", defaultGstRate: 18.0, hsnCode: "3402", description: "Dishwash, floor cleaners, detergent bars, bleaches" },
      { name: "Spices, Masalas & Condiments", codePrefix: "SPICE", defaultGstRate: 5.0, hsnCode: "0910", description: "Turmeric, chilli powder, garam masala, salt, sugar" },
    ],
  },
  {
    id: "pharma_healthcare",
    name: "Pharma, Chemist & Healthcare",
    description: "Prescription drugs, generic medicines, medical devices, and wellness products",
    iconName: "Stethoscope",
    categories: [
      { name: "Prescription Medicines (Rx)", codePrefix: "RX", defaultGstRate: 12.0, hsnCode: "3004", description: "Scheduled H/H1 antibiotics and prescription tablets" },
      { name: "Generic Medicines", codePrefix: "GEN", defaultGstRate: 12.0, hsnCode: "3004", description: "Affordable bio-equivalent generic formulations" },
      { name: "Ayurvedic & Herbal Formulations", codePrefix: "AYUR", defaultGstRate: 5.0, hsnCode: "3003", description: "Chyawanprash, herbal syrups, oils, tonics" },
      { name: "Surgicals & Diagnostic Devices", codePrefix: "SURG", defaultGstRate: 12.0, hsnCode: "9018", description: "Syringes, bandages, BP monitors, oximeters, glucometers" },
      { name: "OTC Wellness & Health Supplements", codePrefix: "OTC", defaultGstRate: 18.0, hsnCode: "2106", description: "Protein powders, vitamins, energy drinks, calcium" },
      { name: "Baby Care & Diapers", codePrefix: "BABY", defaultGstRate: 12.0, hsnCode: "9619", description: "Baby lotions, diapers, wipes, baby formula food" },
    ],
  },
  {
    id: "electronics_mobiles",
    name: "Electronics, Mobiles & IT",
    description: "Smartphones, laptop computers, audio gadgets, appliances and accessories",
    iconName: "Smartphone",
    categories: [
      { name: "Smartphones & Tablets", codePrefix: "MOB", defaultGstRate: 18.0, hsnCode: "8517", description: "5G Android phones, iPhones, iPads, tablets" },
      { name: "Mobile Accessories & Fast Chargers", codePrefix: "ACC", defaultGstRate: 18.0, hsnCode: "8504", description: "Power banks, fast chargers, cables, glass guards" },
      { name: "Laptops & Computers", codePrefix: "IT", defaultGstRate: 18.0, hsnCode: "8471", description: "Laptops, desktops, monitors, SSDs, RAM" },
      { name: "Audio, Bluetooth & Speakers", codePrefix: "AUD", defaultGstRate: 18.0, hsnCode: "8518", description: "TWS earbuds, neckbands, bluetooth soundbars" },
      { name: "Smart LED TVs & Home Theatre", codePrefix: "TV", defaultGstRate: 18.0, hsnCode: "8528", description: "4K Smart TVs, set-top boxes, streaming sticks" },
      { name: "Home & Kitchen Appliances", codePrefix: "APPL", defaultGstRate: 18.0, hsnCode: "8509", description: "Mixer grinders, microwave ovens, water purifiers, irons" },
    ],
  },
  {
    id: "apparel_fashion",
    name: "Apparel, Garments & Fashion",
    description: "Men's, women's, and kid's fashion garments, textiles, and fashion accessories",
    iconName: "Shirt",
    categories: [
      { name: "Men's Casual & Formal Wear", codePrefix: "MENS", defaultGstRate: 12.0, hsnCode: "6203", description: "Shirts, trousers, denim jeans, t-shirts, blazers" },
      { name: "Women's Ethnic & Western Wear", codePrefix: "WMNS", defaultGstRate: 12.0, hsnCode: "6204", description: "Kurtis, sarees, lehengas, tops, dresses" },
      { name: "Kid's & Infant Wear", codePrefix: "KIDS", defaultGstRate: 12.0, hsnCode: "6111", description: "Children clothing, baby rompers, party sets" },
      { name: "Unstitched Fabrics & Dress Materials", codePrefix: "FAB", defaultGstRate: 5.0, hsnCode: "5208", description: "Cotton suit pieces, shirting, suiting fabric" },
      { name: "Innerwear & Loungewear", codePrefix: "INNR", defaultGstRate: 5.0, hsnCode: "6107", description: "Vests, briefs, nightwear, thermal innerwear" },
      { name: "Fashion Bags, Belts & Wallets", codePrefix: "FASH", defaultGstRate: 18.0, hsnCode: "4202", description: "Handbags, backpacks, leather wallets, formal belts" },
    ],
  },
  {
    id: "hardware_paints",
    name: "Hardware, Paints & Electricals",
    description: "Industrial paints, plumbing, sanitary, and construction building hardware",
    iconName: "Hammer",
    categories: [
      { name: "Decorative Paints & Primers", codePrefix: "PNT", defaultGstRate: 28.0, hsnCode: "3208", description: "Interior/exterior emulsions, enamels, distempers, primers" },
      { name: "Nuts, Bolts & Fasteners", codePrefix: "FAST", defaultGstRate: 18.0, hsnCode: "7318", description: "Screws, anchor fasteners, rivets, stainless steel clamps" },
      { name: "Hand Tools & Power Tools", codePrefix: "TOOL", defaultGstRate: 18.0, hsnCode: "8205", description: "Drills, angle grinders, spanners, hammers, measuring tapes" },
      { name: "Plumbing, CPVC Pipes & Fittings", codePrefix: "PLMB", defaultGstRate: 18.0, hsnCode: "3917", description: "CPVC/UPVC pipes, elbows, tees, water tanks, taps" },
      { name: "Electrical Wiring & Modular Switches", codePrefix: "ELEC", defaultGstRate: 18.0, hsnCode: "8536", description: "Copper wires, MCBs, modular switchboards, LED bulbs" },
      { name: "Sanitaryware & Bath Fittings", codePrefix: "SANI", defaultGstRate: 18.0, hsnCode: "6910", description: "Wash basins, commodes, shower panels, brass valves" },
    ],
  },
  {
    id: "automobile_spares",
    name: "Automobile Spares & Lubricants",
    description: "Vehicle replacement spares, lubricants, tyres, and garage service parts",
    iconName: "Car",
    categories: [
      { name: "Engine Oils & Lubricants", codePrefix: "LUBE", defaultGstRate: 18.0, hsnCode: "2710", description: "Synthetic engine oils, gear oils, brake fluids, grease" },
      { name: "Two-Wheeler Spare Parts", codePrefix: "2W", defaultGstRate: 28.0, hsnCode: "8714", description: "Bike chains, brake shoes, spark plugs, clutch cables" },
      { name: "Four-Wheeler & Commercial Spares", codePrefix: "4W", defaultGstRate: 28.0, hsnCode: "8708", description: "Car brake pads, shock absorbers, oil filters, wiper blades" },
      { name: "Automotive Batteries & Inverters", codePrefix: "BATT", defaultGstRate: 28.0, hsnCode: "8507", description: "Exide/Amaron lead-acid batteries, solar inverters" },
      { name: "Tyres & Inner Tubes", codePrefix: "TYRE", defaultGstRate: 28.0, hsnCode: "4011", description: "Tubeless radial tyres, alloy wheels, puncture kits" },
      { name: "Automobile Accessories & Helmets", codePrefix: "ACC", defaultGstRate: 18.0, hsnCode: "6506", description: "ISI certified helmets, car seat covers, LED fog lights" },
    ],
  },
  {
    id: "jewellery_gold_silver",
    name: "Jewellery, Gold, Silver & Gems",
    description: "Gold ornaments, silver articles, diamonds, gemstones, and imitation jewellery",
    iconName: "Gem",
    categories: [
      { name: "Gold Jewellery & Coins (22K / 24K)", codePrefix: "GOLD", defaultGstRate: 3.0, hsnCode: "7113", description: "Hallmarked gold chains, rings, necklaces, bangles" },
      { name: "Silver Utensils & Ornaments (92.5%)", codePrefix: "SLVR", defaultGstRate: 3.0, hsnCode: "7106", description: "Sterling silver pooja items, payals, coins, dinner sets" },
      { name: "Diamond & Gemstone Jewellery", codePrefix: "DIAM", defaultGstRate: 3.0, hsnCode: "7102", description: "Certified solitaire rings, earrings, birthstones" },
      { name: "Fashion & Imitation Jewellery", codePrefix: "IMIT", defaultGstRate: 3.0, hsnCode: "7117", description: "Bridal kundan sets, brass jewellery, oxidised items" },
      { name: "Making & Karigar Labour Charges", codePrefix: "MKG", defaultGstRate: 5.0, hsnCode: "9988", description: "Goldsmith handcrafting and melting labour charges" },
    ],
  },
  {
    id: "restaurant_cafe_bakery",
    name: "Restaurant, Cafe, Bakery & Sweets",
    description: "Food service, cloud kitchens, bakery items, coffee shops, and sweet corners",
    iconName: "Utensils",
    categories: [
      { name: "Restaurant Dining & Takeaway Food", codePrefix: "FOOD", defaultGstRate: 5.0, hsnCode: "9963", description: "Thalis, biryanis, curries, tandoori items, gravies" },
      { name: "Bakery, Cakes & Pastries", codePrefix: "BAKE", defaultGstRate: 18.0, hsnCode: "1905", description: "Fresh cream cakes, breads, cookies, puffs, brownies" },
      { name: "Traditional Mithai & Indian Sweets", codePrefix: "SWT", defaultGstRate: 5.0, hsnCode: "2106", description: "Kaju katli, gulab jamun, rasgulla, motichoor laddu" },
      { name: "Hot Beverages, Tea & Espresso", codePrefix: "CAFE", defaultGstRate: 5.0, hsnCode: "0901", description: "Speciality coffee, masala chai, green tea, hot chocolate" },
      { name: "Fast Food, Pizzas & Burgers", codePrefix: "FAST", defaultGstRate: 5.0, hsnCode: "2106", description: "Burgers, pizzas, wraps, sandwiches, french fries" },
      { name: "Packaged Ice Creams & Desserts", codePrefix: "ICE", defaultGstRate: 18.0, hsnCode: "2105", description: "Cups, cones, family tubs, sundaes, falooda" },
    ],
  },
  {
    id: "building_materials_tiles",
    name: "Building Materials, Cement & Tiles",
    description: "Cement, TMT steel bars, ceramic tiles, plywood, and civil construction items",
    iconName: "Building",
    categories: [
      { name: "Grey & White Cement Bags", codePrefix: "CMNT", defaultGstRate: 28.0, hsnCode: "2523", description: "OPC 53, PPC cement, Birla White, Wall Putty" },
      { name: "TMT Steel Rods & Iron Bars", codePrefix: "STEEL", defaultGstRate: 18.0, hsnCode: "7214", description: "Fe 550D TMT bars, structural steel, binding wires" },
      { name: "Vitrified & Ceramic Tiles", codePrefix: "TILE", defaultGstRate: 18.0, hsnCode: "6907", description: "Floor vitrified tiles, bathroom wall tiles, granite slabs" },
      { name: "Commercial Plywood & Timber", codePrefix: "PLY", defaultGstRate: 18.0, hsnCode: "4412", description: "Waterproof marine ply, MDF boards, decorative veneers" },
      { name: "Construction Sand & Aggregates", codePrefix: "SAND", defaultGstRate: 5.0, hsnCode: "2505", description: "River sand, crushed stone gravel (Rodi), red bricks" },
    ],
  },
  {
    id: "books_stationery_toys",
    name: "Books, Stationery, Gifts & Toys",
    description: "School books, notebooks, office paper, writing stationery, toys and gifts",
    iconName: "BookOpen",
    categories: [
      { name: "Printed Textbooks & Novels", codePrefix: "BOOK", defaultGstRate: 0.0, hsnCode: "4901", description: "NCERT books, CBSE guides, literature novels, comics" },
      { name: "Student Exercise Notebooks", codePrefix: "NOTE", defaultGstRate: 12.0, hsnCode: "4820", description: "Register, spiral diaries, drawing books, rough pads" },
      { name: "Office Stationery, Pens & Files", codePrefix: "STAT", defaultGstRate: 18.0, hsnCode: "9608", description: "Gel pens, markers, staplers, box files, sticky notes" },
      { name: "A4 Copier & Printing Paper", codePrefix: "PAPR", defaultGstRate: 12.0, hsnCode: "4802", description: "75 GSM A4 copier reams, photo gloss paper" },
      { name: "Kids Educational Toys & Games", codePrefix: "TOY", defaultGstRate: 12.0, hsnCode: "9503", description: "Board games, building blocks, puzzles, action toys" },
      { name: "Gift Articles & Fancy Items", codePrefix: "GIFT", defaultGstRate: 18.0, hsnCode: "3926", description: "Photo frames, decorative clocks, gift wraps, trophies" },
    ],
  },
  {
    id: "cosmetics_salon_beauty",
    name: "Cosmetics, Salon & Beauty Care",
    description: "Professional beauty salon products, cosmetics, perfumes, and skincare",
    iconName: "Sparkles",
    categories: [
      { name: "Color Cosmetics & Makeup", codePrefix: "MKUP", defaultGstRate: 18.0, hsnCode: "3304", description: "Lipsticks, foundations, compact powders, eyeliners, kajal" },
      { name: "Professional Hair Care & Colors", codePrefix: "HAIR", defaultGstRate: 18.0, hsnCode: "3305", description: "Hair spa creams, hair colors, serums, straighteners" },
      { name: "Luxury Perfumes & Deodorants", codePrefix: "SCNT", defaultGstRate: 18.0, hsnCode: "3307", description: "EDP perfumes, body sprays, attar, body mists" },
      { name: "Skincare, Serums & Sunscreens", codePrefix: "SKIN", defaultGstRate: 18.0, hsnCode: "3304", description: "Face serums, night creams, SPF 50 sunscreens, cleansers" },
      { name: "Salon Equipment & Grooming Tools", codePrefix: "TOOL", defaultGstRate: 18.0, hsnCode: "8510", description: "Hair dryers, trimmers, curling tongs, facial steamers" },
    ],
  },
  {
    id: "agriculture_fertilizers",
    name: "Agriculture, Seeds & Fertilizers",
    description: "Certified crop seeds, fertilizers, pesticides, and modern farming equipment",
    iconName: "Sprout",
    categories: [
      { name: "Certified Hybrid Crop Seeds", codePrefix: "SEED", defaultGstRate: 0.0, hsnCode: "1209", description: "Wheat seeds, paddy hybrid, vegetable seeds, pulses" },
      { name: "Chemical & Bio Fertilizers", codePrefix: "FERT", defaultGstRate: 5.0, hsnCode: "3102", description: "Urea, DAP, NPK, potash, organic vermicompost" },
      { name: "Insecticides & Crop Pesticides", codePrefix: "PEST", defaultGstRate: 18.0, hsnCode: "3808", description: "Fungicides, weedicides, plant growth promoters" },
      { name: "Micro Irrigation & Drip Pipes", codePrefix: "DRIP", defaultGstRate: 12.0, hsnCode: "8424", description: "Drip lateral pipes, sprinkler nozzles, fertigation units" },
      { name: "Cattle Feed & Animal Nutrition", codePrefix: "FEED", defaultGstRate: 0.0, hsnCode: "2309", description: "Churi, khal, mineral mixtures, poultry feed" },
    ],
  },
  {
    id: "furniture_home_decor",
    name: "Furniture, Home Decor & Interior",
    description: "Wooden furniture, mattresses, curtains, lighting, and modular home decor",
    iconName: "Armchair",
    categories: [
      { name: "Living & Bedroom Wooden Furniture", codePrefix: "FURN", defaultGstRate: 18.0, hsnCode: "9403", description: "King size beds, wardrobes, sofa sets, dining tables" },
      { name: "Orthopedic Mattresses & Pillows", codePrefix: "MATR", defaultGstRate: 18.0, hsnCode: "9404", description: "Memory foam mattresses, spring beds, latex pillows" },
      { name: "Curtains, Blinds & Upholstery", codePrefix: "CURT", defaultGstRate: 12.0, hsnCode: "6303", description: "Blackout curtains, sofa fabrics, sheer nets, bedsheets" },
      { name: "Modern Lighting, Chandeliers & Lamps", codePrefix: "LITE", defaultGstRate: 18.0, hsnCode: "9405", description: "Designer pendant lights, wall sconces, floor lamps" },
      { name: "Modular Kitchen Units & Hardware", codePrefix: "KTCH", defaultGstRate: 18.0, hsnCode: "8302", description: "Soft-close tandem boxes, pull-out baskets, hinges" },
    ],
  },
  {
    id: "footwear_leather_goods",
    name: "Footwear & Leather Goods",
    description: "Formal shoes, sports sneakers, leather goods, travel luggage, and accessories",
    iconName: "Footprints",
    categories: [
      { name: "Men's Formal & Leather Shoes", codePrefix: "SHOE", defaultGstRate: 18.0, hsnCode: "6403", description: "Oxford shoes, loafers, leather boots, monk straps" },
      { name: "Sports Running Shoes & Sneakers", codePrefix: "SPRT", defaultGstRate: 12.0, hsnCode: "6404", description: "Running sneakers, gym trainers, football studs" },
      { name: "Women's Heels, Flats & Sandals", codePrefix: "SAND", defaultGstRate: 12.0, hsnCode: "6402", description: "Block heels, wedges, party sandals, daily kolhapuris" },
      { name: "Travel Luggage, Trolleys & Duffles", codePrefix: "LUGG", defaultGstRate: 18.0, hsnCode: "4202", description: "Hard-top spinner trolleys, cabin bags, travel duffles" },
      { name: "Shoe Care & Insole Accessories", codePrefix: "CARE", defaultGstRate: 18.0, hsnCode: "3405", description: "Shoe polish, suede brush, memory insoles, laces" },
    ],
  },
  {
    id: "optical_eyewear",
    name: "Optical, Eyewear & Sunglasses",
    description: "Spectacle frames, prescription ophthalmic lenses, polarized sunglasses",
    iconName: "Glasses",
    categories: [
      { name: "Spectacle Frames & Mountings", codePrefix: "FRAM", defaultGstRate: 12.0, hsnCode: "9003", description: "Titanium frames, acetate spectacles, rimless frames" },
      { name: "Prescription Ophthalmic Lenses", codePrefix: "LENS", defaultGstRate: 12.0, hsnCode: "9001", description: "Anti-glare blue cut lenses, progressives, bifocals" },
      { name: "UV Polarized Sunglasses", codePrefix: "SUNG", defaultGstRate: 18.0, hsnCode: "9004", description: "Aviators, wayfarers, driving polarized sunglasses" },
      { name: "Contact Lenses & Care Solutions", codePrefix: "CONT", defaultGstRate: 12.0, hsnCode: "9001", description: "Monthly disposable lenses, lens cleaning liquids" },
    ],
  },
];
