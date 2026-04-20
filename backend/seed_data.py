"""Seed data: full Chaioz menu (from official PDF) + retail products."""

# Curated item-specific imagery (Unsplash/Pexels — free commercial use)
IMG_CHAI_KARAK = "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800&q=80"
IMG_CHAI_MASALA = "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=800&q=80"
IMG_CHAI_KESAR = "https://images.unsplash.com/photo-1618221118493-9cfa1a1c00da?w=800&q=80"
IMG_CHAI_GINGER = "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80"
IMG_CHAI_PINK = "https://images.unsplash.com/photo-1558857563-b371033873b8?w=800&q=80"
IMG_COFFEE = "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80"
IMG_HOT_CHOC = "https://images.unsplash.com/photo-1542990253-0b8be1c0c1f4?w=800&q=80"
IMG_GREEN_TEA = "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=80"
IMG_MINT_TEA = "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800&q=80"
IMG_ICED_COFFEE = "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80"
IMG_FALOODA = "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=800&q=80"
IMG_MANGO_DRINK = "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80"
IMG_COOLER = "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80"
IMG_MATCHA = "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&q=80"
IMG_MOCKTAIL = "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80"
IMG_CHURROS = "https://images.unsplash.com/photo-1624371414361-e670edf4898d?w=800&q=80"
IMG_GULAB_JAMUN = "https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?w=800&q=80"
IMG_HALWA = "https://images.unsplash.com/photo-1606471191009-63994c53433b?w=800&q=80"
IMG_MILKCAKE = "https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=800&q=80"
IMG_CAKE = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80"
IMG_CHEESECAKE = "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80"
IMG_ICE_CREAM = "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&q=80"
IMG_KULFI = "https://images.unsplash.com/photo-1560008581-09826d1de69e?w=800&q=80"
IMG_BUN_MASKA = "https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800&q=80"
IMG_OMELETTE = "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800&q=80"
IMG_WRAP = "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80"
IMG_PARATHA = "https://images.unsplash.com/photo-1626777553635-46cd35b1b5b0?w=800&q=80"
IMG_BUTTER_CHICKEN = "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80"
IMG_PANEER = "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80"
IMG_CHANNA = "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80"
IMG_SANDWICH = "https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=800&q=80"
IMG_MASALA_CHIPS = "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&q=80"
IMG_CAULIFLOWER = "https://images.unsplash.com/photo-1625944525533-473f1b3d9684?w=800&q=80"
IMG_CHAAT = "https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80"
IMG_MOMOS = "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&q=80"
IMG_SAMOSA = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80"
IMG_VADA_PAV = "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80"
IMG_CHICKEN_BITES = "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80"
IMG_PUFF_PATTY = "https://images.unsplash.com/photo-1601312378427-822b2b41da35?w=800&q=80"
RETAIL_IMG = "https://static.prod-images.emergentagent.com/jobs/7ffc6ec8-b182-4519-9a18-5bb47b9cfc96/images/15c37367a7e230b40bd8c86a9054db75f95e9b4f95d5f78198d24c35807cdc0f.png"

SIZE_REG_LARGE = [{"name": "Regular", "price_delta": 0}, {"name": "Large", "price_delta": 1.0}]
DRINK_ADDONS = [
    {"name": "Honey", "price": 0.5},
    {"name": "Jaggery", "price": 0.5},
    {"name": "Saffron", "price": 0.5},
    {"name": "Almonds", "price": 0.5},
    {"name": "Mint", "price": 0.5},
]
MEAL_ADDONS = [
    {"name": "Onion", "price": 0.5},
    {"name": "Cheese", "price": 0.5},
    {"name": "Chilli", "price": 0.5},
    {"name": "Hashbrown", "price": 1.95},
    {"name": "Samosa", "price": 3.95},
]


def menu_items():
    items = []
    sort = 0

    def add(name, price, category, subcategory=None, desc="", sizes=None, addons=None, calories=None, bestseller=False, vegan=False, image=None):
        nonlocal sort
        sort += 1
        items.append({
            "name": name,
            "description": desc,
            "price": price,
            "category": category,
            "subcategory": subcategory,
            "image": image or IMG_CHAI_KARAK,
            "calories": calories,
            "sizes": sizes or [],
            "addons": addons or [],
            "is_bestseller": bestseller,
            "is_vegan": vegan,
            "sort_order": sort,
        })

    # Hot Drinks
    add("Karak Classic", 4.95, "Hot Drinks", "Signature", "Our world famous traditional chaii (tea) freshly brewed with our signature blend of spices.", SIZE_REG_LARGE, DRINK_ADDONS, "144 / 216 kcal", bestseller=True, image=IMG_CHAI_KARAK)
    add("Masala Chai", 4.95, "Hot Drinks", "Signature", "Freshly brewed with our signature blend of warming spices.", SIZE_REG_LARGE, DRINK_ADDONS, "144 / 216 kcal", bestseller=True, image=IMG_CHAI_MASALA)
    add("Kesar Chai", 5.95, "Hot Drinks", "Signature", "Saffron-infused chai with a luxurious aroma.", SIZE_REG_LARGE, DRINK_ADDONS, "144 / 216 kcal", bestseller=True, image=IMG_CHAI_KESAR)
    add("Ginger Chai", 4.95, "Hot Drinks", "Signature", "Zesty ginger with traditional spice blend.", SIZE_REG_LARGE, DRINK_ADDONS, "101 / 152 kcal", image=IMG_CHAI_GINGER)
    add("Pink Chai", 4.95, "Hot Drinks", "Signature", "A milky pink chaii infused with vanilla and our signature fragrant spices.", SIZE_REG_LARGE, DRINK_ADDONS, "144 / 216 kcal", image=IMG_CHAI_PINK)
    add("Karak Coffee", 4.95, "Hot Drinks", "Coffee", "A creamy brewed coffee with the touch of our signature karak magic.", SIZE_REG_LARGE, DRINK_ADDONS, "137 / 205 kcal", image=IMG_COFFEE)
    add("Hot Chocolate", 4.95, "Hot Drinks", "Coffee", "Smooth, chocolatey and comforting with hot milk.", SIZE_REG_LARGE, DRINK_ADDONS, "236 / 354 kcal", image=IMG_HOT_CHOC)
    add("Kashmiri Kahwa", 4.95, "Hot Drinks", "Tea", "Light green tea infused with saffron and aromatic spices.", SIZE_REG_LARGE, DRINK_ADDONS, "221 / 287 kcal", image=IMG_GREEN_TEA)
    add("Mint Tea", 4.95, "Hot Drinks", "Tea", "Refreshing herbal peppermint tea.", SIZE_REG_LARGE, DRINK_ADDONS, "2 / 3 kcal", image=IMG_MINT_TEA)
    add("Vegan Chai", 5.95, "Hot Drinks", "Signature", "Classic chaii or Masala Chaii made with oat or almond milk.", SIZE_REG_LARGE, DRINK_ADDONS, "110 / 160 kcal", vegan=True, image=IMG_CHAI_MASALA)

    # Cold Drinks
    add("Iced Karak Coffee", 7.95, "Cold Drinks", "Signature", "Bold, strong coffee served chilled over ice.", SIZE_REG_LARGE, DRINK_ADDONS, "125 / 175 kcal", image=IMG_ICED_COFFEE)
    add("Rabadi Falooda", 9.95, "Cold Drinks", "Signature", "Creamy, thickened, sweetened milkshake topped with crushed nuts.", SIZE_REG_LARGE, [], "300 / 405 kcal", bestseller=True, image=IMG_FALOODA)
    add("Rose Falooda", 9.95, "Cold Drinks", "Signature", "Rose ice cream milkshake topped with crushed nuts.", SIZE_REG_LARGE, [], "280 / 380 kcal", image=IMG_FALOODA)
    add("Aam Panna", 7.95, "Cold Drinks", "Signature", "Tangy raw mango drink with a refreshing, spiced finish.", SIZE_REG_LARGE, [], "100 / 145 kcal", image=IMG_MANGO_DRINK)
    add("Lemon Lime Cooler", 7.95, "Cold Drinks", "Coolers", "Light, fizzy and refreshing.", SIZE_REG_LARGE, [], "85 / 140 kcal", vegan=True, image=IMG_COOLER)
    add("Strawberry Cooler", 7.95, "Cold Drinks", "Coolers", "Light, fizzy and refreshing strawberry cooler.", SIZE_REG_LARGE, [], "100 / 165 kcal", vegan=True, image=IMG_COOLER)
    add("Blueberry Cooler", 7.95, "Cold Drinks", "Coolers", "Fizzy and refreshing blueberry cooler.", SIZE_REG_LARGE, [], "95 / 155 kcal", vegan=True, image=IMG_COOLER)
    add("Pistachio Matcha", 8.95, "Cold Drinks", "Matcha", "Grade 1 matcha with pistachio.", SIZE_REG_LARGE, [], "180 / 250 kcal", image=IMG_MATCHA)
    add("Blueberry & White Chocolate Matcha", 8.95, "Cold Drinks", "Matcha", "Grade 1 matcha with blueberry and white chocolate.", SIZE_REG_LARGE, [], "200 / 280 kcal", image=IMG_MATCHA)
    add("Rose Falooda Matcha", 8.95, "Cold Drinks", "Matcha", "Grade 1 matcha with rose falooda blend.", SIZE_REG_LARGE, [], "210 / 295 kcal", image=IMG_MATCHA)
    add("Tahitian Lime Mocktail", 8.95, "Cold Drinks", "Mocktails", "A refreshing sparkling lime mojito with fresh mint.", SIZE_REG_LARGE, [], "125 / 175 kcal", vegan=True, image=IMG_MOCKTAIL)
    add("Mango Mojito", 8.95, "Cold Drinks", "Mocktails", "A spritz of mango flavour, with fresh mint.", SIZE_REG_LARGE, [], "120 / 180 kcal", vegan=True, image=IMG_MOCKTAIL)
    add("Watermelon Spritz", 8.95, "Cold Drinks", "Mocktails", "Sparkling watermelon and lime mojito with fresh mint.", SIZE_REG_LARGE, [], "85 / 135 kcal", vegan=True, image=IMG_MOCKTAIL)
    add("Lychee Mojito", 8.95, "Cold Drinks", "Mocktails", "Tropical lychee with mint and citrus notes.", SIZE_REG_LARGE, [], "115 / 175 kcal", vegan=True, image=IMG_MOCKTAIL)

    # Desserts
    add("Loaded Churros", 8.95, "Desserts", "Customer Favourites", "Crispy churros topped with rich sauces and crunchy extras (4 pcs).", [], [], "420 kcal", bestseller=True, image=IMG_CHURROS)
    add("Pistachio Fix", 6.95, "Desserts", "Customer Favourites", "Vanilla ice cream topped with crunchy pistachio praline and chocolate sauce.", [], [], "380 kcal", image=IMG_ICE_CREAM)
    add("Nutella Wrap", 5.95, "Desserts", "Customer Favourites", "Warm wrap filled with smooth Nutella and toasted to perfection.", [], [], "360 kcal", image=IMG_WRAP)
    add("Gulab Jamun", 7.95, "Desserts", "Desi Delights", "Fried milk-based dough balls soaked in fragrant sugar syrup.", [], [{"name": "Add Rabadi", "price": 1.0}], "320 kcal", image=IMG_GULAB_JAMUN)
    add("Gajar Halwa", 8.95, "Desserts", "Desi Delights", "A rich and traditional carrot dessert pudding.", [], [], "350 kcal", image=IMG_HALWA)
    add("Pistachio Milkcake", 9.95, "Desserts", "Signature Milkcakes", "Rich, creamy nutty sponge served in pistachio milk bath topped with crushed pistachios.", [], [], "360 kcal", bestseller=True, image=IMG_MILKCAKE)
    add("Rose Milkcake", 9.95, "Desserts", "Signature Milkcakes", "Light milk cake infused with delicate rose flavours.", [], [], "350 kcal", bestseller=True, image=IMG_MILKCAKE)
    add("Silky Red Velvet", 6.95, "Desserts", "A Piece of Cake", "Soft red velvet sponge layered with cream cheese frosting.", [], [], "380 kcal", image=IMG_CAKE)
    add("Chocolate Dream Cake", 6.95, "Desserts", "A Piece of Cake", "Rich chocolate sponge with a deep, indulgent cocoa finish.", [], [], "400 kcal", image=IMG_CAKE)
    add("Loaded Cheesecake", 6.95, "Desserts", "A Piece of Cake", "Creamy baked cheesecake topped with indulgent layers.", [], [], "450 kcal", image=IMG_CHEESECAKE)
    add("Cassatta Slice", 8.95, "Desserts", "Ice Cream", "Layered ice cream with nuts, sponge and tutti frutti.", [], [], "320 kcal", image=IMG_ICE_CREAM)
    add("Traditional Kulfi", 4.95, "Desserts", "Ice Cream", "Dense, slow-set Indian ice cream — 4 flavour choices.", [], [{"name": "Add ice cream", "price": 1.0}], "300 kcal", image=IMG_KULFI)

    # All Day Breakfast
    add("Bun Omelette", 7.95, "Breakfast", "Desi Bun Brekie", "Soft bun stuffed with masala omelette with choice of toppings.", [], MEAL_ADDONS, "320 kcal", image=IMG_OMELETTE)
    add("Bun Maska", 5.95, "Breakfast", "Desi Bun Brekie", "Buttery soft bun with choice of biscoff or jam or nutella.", [], MEAL_ADDONS, "280 kcal", bestseller=True, image=IMG_BUN_MASKA)
    add("Bun Samosa", 8.95, "Breakfast", "Desi Bun Brekie", "Crunchy samosa in bun with chutney & onions.", [], MEAL_ADDONS, "390 kcal", image=IMG_SAMOSA)
    add("Omelette Wrap", 7.95, "Breakfast", "Brekkie Wraps", "Fluffy masala omelette wrapped with fresh herbs and sauce in a warm flatbread.", [], MEAL_ADDONS, "380 kcal", image=IMG_WRAP)
    add("Spiced Chicken & Egg Wrap", 8.95, "Breakfast", "Brekkie Wraps", "Tandoori chicken and masala omelette with onions and chutney.", [], MEAL_ADDONS, "410 kcal — 30g protein", image=IMG_WRAP)
    add("Bacon & Egg Wrap", 8.95, "Breakfast", "Brekkie Wraps", "Crispy bacon, masala omelette.", [], MEAL_ADDONS, "460 kcal", image=IMG_WRAP)
    add("Mixed Paratha", 7.95, "Breakfast", "Staples", "Paratha filled with vegetables, served with mint dip.", [], MEAL_ADDONS, "480 kcal", vegan=False, image=IMG_PARATHA)
    add("Aloo Paratha", 7.95, "Breakfast", "Staples", "Paratha filled with spiced potato, served with mint dip.", [], MEAL_ADDONS, "520 kcal", image=IMG_PARATHA)
    add("Brekie Deal", 11.95, "Breakfast", "Combo", "Any wrap, hashbrown & kadak chai or kadak coffee. Available until 3pm.", [], [], "~700 kcal", bestseller=True, image=IMG_WRAP)

    # All Day Eats
    add("Butter Chicken Bowl", 14.95, "All Day Eats", "Bombay Bowls", "Creamy butter chicken with rice or chips, salad & chutney.", [{"name": "Rice", "price_delta": 0}, {"name": "Chips", "price_delta": 0}], [], "650 kcal", bestseller=True, image=IMG_BUTTER_CHICKEN)
    add("Paneer Makhani Bowl", 14.95, "All Day Eats", "Bombay Bowls", "Creamy paneer makhani with rice or chips, salad & chutney.", [{"name": "Rice", "price_delta": 0}, {"name": "Chips", "price_delta": 0}], [], "680 kcal", image=IMG_PANEER)
    add("Channa Masala Bowl", 13.95, "All Day Eats", "Bombay Bowls", "Spiced chickpea curry with rice or chips, salad & chutney.", [{"name": "Rice", "price_delta": 0}, {"name": "Chips", "price_delta": 0}], [], "560 kcal", vegan=True, image=IMG_CHANNA)
    add("Paneer Sandwich", 13.95, "All Day Eats", "Bombay Toasties", "Creamy schezwan paneer with chaioz spices in toasted bread.", [], [{"name": "Add Fries", "price": 2.95}], "520 kcal", image=IMG_SANDWICH)
    add("Classic Bombay", 11.95, "All Day Eats", "Bombay Toasties", "Aloo potato infused with classic spices and green chutney.", [], [{"name": "Add Fries", "price": 2.95}], "520 kcal", vegan=True, image=IMG_SANDWICH)
    add("Tandoori Chicken Melt", 12.95, "All Day Eats", "Bombay Toasties", "Chicken with tandoori sauce, melted cheese & mayo toastie.", [], [{"name": "Add Fries", "price": 2.95}], "520 kcal", image=IMG_SANDWICH)
    add("Chicken Classic", 13.95, "All Day Eats", "Bombay Toasties", "Pulled chicken with our chaioz recipe in toasted bread.", [], [{"name": "Add Fries", "price": 2.95}], "520 kcal", image=IMG_SANDWICH)
    add("Veg Twister Wrap", 11.95, "All Day Eats", "Chaioz Wraps", "Crispy potato tikki with fresh salad and cheesy sauce.", [], [{"name": "Add Fries", "price": 2.95}], "480 kcal", vegan=True, image=IMG_WRAP)
    add("Paneer Makhani Wrap", 12.95, "All Day Eats", "Chaioz Wraps", "Paneer makhani cubes with fresh salad & mayo.", [], [{"name": "Add Fries", "price": 2.95}], "540 kcal", image=IMG_WRAP)
    add("Butter Chicken Wrap", 11.95, "All Day Eats", "Chaioz Wraps", "Succulent pulled masala butter chicken in a classic naan.", [], [{"name": "Add Fries", "price": 2.95}], "560 kcal", image=IMG_WRAP)
    add("Tandoori Chicken Wrap", 12.95, "All Day Eats", "Chaioz Wraps", "Tandoori chicken with onions & minty yoghurt chutney.", [], [{"name": "Add Fries", "price": 2.95}], "600 kcal", image=IMG_WRAP)

    # Street Food
    add("Masala Chips", 7.95, "Street Food", "Bites", "Fries tossed in Chaioz masala sauce and signature seasoning.", [], [], "420 kcal", vegan=True, image=IMG_MASALA_CHIPS)
    add("Honey Chilli Cauliflower", 11.95, "Street Food", "Bites", "Crispy cauliflower tossed in sweet-spicy Chaioz sauce.", [], [], "420 kcal", vegan=True, image=IMG_CAULIFLOWER)
    add("Samosa Chaat", 11.95, "Street Food", "Bites", "Crushed samosas topped with spiced chickpeas, yogurt, chutneys & onions.", [], [], "420 kcal", image=IMG_CHAAT)
    add("Veg Momos (5pcs)", 9.95, "Street Food", "Bites", "Steamed vegetable dumplings with sweet chilli sauce.", [], [], "300 kcal", vegan=True, image=IMG_MOMOS)
    add("Cheesy Chips", 8.95, "Street Food", "Bites", "Crispy fries in Chaioz cheesy sauce and seasoning.", [], [], "460 kcal", image=IMG_MASALA_CHIPS)
    add("Aloo Tikki Sliders (2pcs)", 10.95, "Street Food", "Bites", "Mini spiced potato patties in slider buns with chaioz filling.", [], [], "440 kcal", vegan=True, image=IMG_VADA_PAV)
    add("Aloo Tikki Chaat", 11.95, "Street Food", "Bites", "Crushed spiced potato patties with yogurt, chutneys & onions.", [], [], "390 kcal", image=IMG_CHAAT)
    add("Jalapeño Cheese Bites (6pcs)", 9.95, "Street Food", "Bites", "Crispy bites filled with creamy cheese and a mild jalapeño kick.", [], [], "420 kcal", image=IMG_CHICKEN_BITES)
    add("Mix Pakode", 9.95, "Street Food", "Bites", "Vegetable fritters topped with Chaioz masala.", [], [], "360 kcal", vegan=True, image=IMG_SAMOSA)
    add("Samosa (2pcs)", 7.95, "Street Food", "Bites", "Crispy pastry filled with spiced potato and peas.", [], [], "260 kcal", vegan=True, image=IMG_SAMOSA)
    add("Vada Pav", 9.95, "Street Food", "Bites", "Spiced potato fritter in a soft bun with chutneys, Mumbai-style.", [], [], "360 kcal", vegan=True, image=IMG_VADA_PAV)
    add("Chick-a Boom Bites", 9.95, "Street Food", "Bites", "Crispy chicken bites with a bold, savoury crunch.", [], [], "420 kcal", image=IMG_CHICKEN_BITES)
    add("Aloo Puff Patty", 7.95, "Street Food", "Puff Patty", "Flaky pastry filled with spiced potato masala.", [], [], "280 kcal", vegan=True, image=IMG_PUFF_PATTY)
    add("Paneer Puff Patty", 8.95, "Street Food", "Puff Patty", "Buttery puff pastry stuffed with spiced paneer filling.", [], [], "320 kcal", image=IMG_PUFF_PATTY)
    add("Chicken Puff Patty", 8.95, "Street Food", "Puff Patty", "Golden puff pastry filled with seasoned chicken mince. 20g protein.", [], [], "340 kcal", image=IMG_PUFF_PATTY)

    return items


def retail_products():
    return [
        {"name": "Karak Classic Chai Blend (250g)", "description": "Our signature spice blend, sealed for freshness. Brew the iconic Chaioz cup at home.", "price": 24.95, "category": "Chai Blends", "image": RETAIL_IMG, "stock": 100, "is_subscription": False, "sort_order": 1},
        {"name": "Kesar Chai Blend (200g)", "description": "Saffron-infused premium blend with cardamom and warming spices.", "price": 32.95, "category": "Chai Blends", "image": RETAIL_IMG, "stock": 60, "is_subscription": False, "sort_order": 2},
        {"name": "Pink Chai Blend (200g)", "description": "Kashmiri-style chai with a delicate vanilla finish.", "price": 28.95, "category": "Chai Blends", "image": RETAIL_IMG, "stock": 50, "is_subscription": False, "sort_order": 3},
        {"name": "Festive Gift Box", "description": "Three signature blends, hand-tied in ribbon. The perfect gift for chai lovers.", "price": 79.95, "category": "Gift Boxes", "image": RETAIL_IMG, "stock": 30, "is_subscription": False, "sort_order": 4},
        {"name": "Late Night Ritual Box", "description": "Karak blend + ceramic cup + pistachio milkcake mix. Made for cosy evenings.", "price": 99.95, "category": "Gift Boxes", "image": RETAIL_IMG, "stock": 25, "is_subscription": False, "sort_order": 5},
        {"name": "Chaioz Ceramic Cup", "description": "Hand-glazed ceramic chai cup featuring our signature mandala motif.", "price": 19.95, "category": "Merch", "image": RETAIL_IMG, "stock": 80, "is_subscription": False, "sort_order": 6},
        {"name": "Chaioz Tote Bag", "description": "Heavy canvas tote with embroidered chaioz monogram.", "price": 24.95, "category": "Merch", "image": RETAIL_IMG, "stock": 60, "is_subscription": False, "sort_order": 7},
        {"name": "Monthly Chai Pack — Subscription", "description": "A new signature blend delivered to your door every month. Cancel anytime.", "price": 39.95, "category": "Subscription", "image": RETAIL_IMG, "stock": 999, "is_subscription": True, "sort_order": 8},
    ]
