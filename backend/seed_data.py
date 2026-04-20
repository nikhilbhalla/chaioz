"""Seed data: full Chaioz menu (from official PDF) + retail products."""

CHAI_IMG = "https://static.prod-images.emergentagent.com/jobs/7ffc6ec8-b182-4519-9a18-5bb47b9cfc96/images/0541d98d204de4f369b3369b8537f36258ac67b686df88d760a0cbf6cee08ece.png"
SNACKS_IMG = "https://static.prod-images.emergentagent.com/jobs/7ffc6ec8-b182-4519-9a18-5bb47b9cfc96/images/af3bbb81ecdd9f6da2491746b5bcca7b748689b891de11b8d2d3618b4bd6cc5e.png"
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

    def add(name, price, category, subcategory=None, desc="", sizes=None, addons=None, calories=None, bestseller=False, vegan=False):
        nonlocal sort
        sort += 1
        items.append({
            "name": name,
            "description": desc,
            "price": price,
            "category": category,
            "subcategory": subcategory,
            "image": CHAI_IMG if category in ("Hot Drinks", "Cold Drinks") else SNACKS_IMG,
            "calories": calories,
            "sizes": sizes or [],
            "addons": addons or [],
            "is_bestseller": bestseller,
            "is_vegan": vegan,
            "sort_order": sort,
        })

    # Hot Drinks
    add("Karak Classic", 4.95, "Hot Drinks", "Signature", "Our world famous traditional chaii (tea) freshly brewed with our signature blend of spices.", SIZE_REG_LARGE, DRINK_ADDONS, "144 / 216 kcal", bestseller=True)
    add("Masala Chai", 4.95, "Hot Drinks", "Signature", "Freshly brewed with our signature blend of warming spices.", SIZE_REG_LARGE, DRINK_ADDONS, "144 / 216 kcal", bestseller=True)
    add("Kesar Chai", 5.95, "Hot Drinks", "Signature", "Saffron-infused chai with a luxurious aroma.", SIZE_REG_LARGE, DRINK_ADDONS, "144 / 216 kcal", bestseller=True)
    add("Ginger Chai", 4.95, "Hot Drinks", "Signature", "Zesty ginger with traditional spice blend.", SIZE_REG_LARGE, DRINK_ADDONS, "101 / 152 kcal")
    add("Pink Chai", 4.95, "Hot Drinks", "Signature", "A milky pink chaii infused with vanilla and our signature fragrant spices.", SIZE_REG_LARGE, DRINK_ADDONS, "144 / 216 kcal")
    add("Karak Coffee", 4.95, "Hot Drinks", "Coffee", "A creamy brewed coffee with the touch of our signature karak magic.", SIZE_REG_LARGE, DRINK_ADDONS, "137 / 205 kcal")
    add("Hot Chocolate", 4.95, "Hot Drinks", "Coffee", "Smooth, chocolatey and comforting with hot milk.", SIZE_REG_LARGE, DRINK_ADDONS, "236 / 354 kcal")
    add("Kashmiri Kahwa", 4.95, "Hot Drinks", "Tea", "Light green tea infused with saffron and aromatic spices.", SIZE_REG_LARGE, DRINK_ADDONS, "221 / 287 kcal")
    add("Mint Tea", 4.95, "Hot Drinks", "Tea", "Refreshing herbal peppermint tea.", SIZE_REG_LARGE, DRINK_ADDONS, "2 / 3 kcal")
    add("Vegan Chai", 5.95, "Hot Drinks", "Signature", "Classic chaii or Masala Chaii made with oat or almond milk.", SIZE_REG_LARGE, DRINK_ADDONS, "110 / 160 kcal", vegan=True)

    # Cold Drinks
    add("Iced Karak Coffee", 7.95, "Cold Drinks", "Signature", "Bold, strong coffee served chilled over ice.", SIZE_REG_LARGE, DRINK_ADDONS, "125 / 175 kcal")
    add("Rabadi Falooda", 9.95, "Cold Drinks", "Signature", "Creamy, thickened, sweetened milkshake topped with crushed nuts.", SIZE_REG_LARGE, [], "300 / 405 kcal", bestseller=True)
    add("Rose Falooda", 9.95, "Cold Drinks", "Signature", "Rose ice cream milkshake topped with crushed nuts.", SIZE_REG_LARGE, [], "280 / 380 kcal")
    add("Aam Panna", 7.95, "Cold Drinks", "Signature", "Tangy raw mango drink with a refreshing, spiced finish.", SIZE_REG_LARGE, [], "100 / 145 kcal")
    add("Lemon Lime Cooler", 7.95, "Cold Drinks", "Coolers", "Light, fizzy and refreshing.", SIZE_REG_LARGE, [], "85 / 140 kcal", vegan=True)
    add("Strawberry Cooler", 7.95, "Cold Drinks", "Coolers", "Light, fizzy and refreshing strawberry cooler.", SIZE_REG_LARGE, [], "100 / 165 kcal", vegan=True)
    add("Blueberry Cooler", 7.95, "Cold Drinks", "Coolers", "Fizzy and refreshing blueberry cooler.", SIZE_REG_LARGE, [], "95 / 155 kcal", vegan=True)
    add("Pistachio Matcha", 8.95, "Cold Drinks", "Matcha", "Grade 1 matcha with pistachio.", SIZE_REG_LARGE, [], "180 / 250 kcal")
    add("Blueberry & White Chocolate Matcha", 8.95, "Cold Drinks", "Matcha", "Grade 1 matcha with blueberry and white chocolate.", SIZE_REG_LARGE, [], "200 / 280 kcal")
    add("Rose Falooda Matcha", 8.95, "Cold Drinks", "Matcha", "Grade 1 matcha with rose falooda blend.", SIZE_REG_LARGE, [], "210 / 295 kcal")
    add("Tahitian Lime Mocktail", 8.95, "Cold Drinks", "Mocktails", "A refreshing sparkling lime mojito with fresh mint.", SIZE_REG_LARGE, [], "125 / 175 kcal", vegan=True)
    add("Mango Mojito", 8.95, "Cold Drinks", "Mocktails", "A spritz of mango flavour, with fresh mint.", SIZE_REG_LARGE, [], "120 / 180 kcal", vegan=True)
    add("Watermelon Spritz", 8.95, "Cold Drinks", "Mocktails", "Sparkling watermelon and lime mojito with fresh mint.", SIZE_REG_LARGE, [], "85 / 135 kcal", vegan=True)
    add("Lychee Mojito", 8.95, "Cold Drinks", "Mocktails", "Tropical lychee with mint and citrus notes.", SIZE_REG_LARGE, [], "115 / 175 kcal", vegan=True)

    # Desserts
    add("Loaded Churros", 8.95, "Desserts", "Customer Favourites", "Crispy churros topped with rich sauces and crunchy extras (4 pcs).", [], [], "420 kcal", bestseller=True)
    add("Pistachio Fix", 6.95, "Desserts", "Customer Favourites", "Vanilla ice cream topped with crunchy pistachio praline and chocolate sauce.", [], [], "380 kcal")
    add("Nutella Wrap", 5.95, "Desserts", "Customer Favourites", "Warm wrap filled with smooth Nutella and toasted to perfection.", [], [], "360 kcal")
    add("Gulab Jamun", 7.95, "Desserts", "Desi Delights", "Fried milk-based dough balls soaked in fragrant sugar syrup.", [], [{"name": "Add Rabadi", "price": 1.0}], "320 kcal")
    add("Gajar Halwa", 8.95, "Desserts", "Desi Delights", "A rich and traditional carrot dessert pudding.", [], [], "350 kcal")
    add("Pistachio Milkcake", 9.95, "Desserts", "Signature Milkcakes", "Rich, creamy nutty sponge served in pistachio milk bath topped with crushed pistachios.", [], [], "360 kcal", bestseller=True)
    add("Rose Milkcake", 9.95, "Desserts", "Signature Milkcakes", "Light milk cake infused with delicate rose flavours.", [], [], "350 kcal", bestseller=True)
    add("Silky Red Velvet", 6.95, "Desserts", "A Piece of Cake", "Soft red velvet sponge layered with cream cheese frosting.", [], [], "380 kcal")
    add("Chocolate Dream Cake", 6.95, "Desserts", "A Piece of Cake", "Rich chocolate sponge with a deep, indulgent cocoa finish.", [], [], "400 kcal")
    add("Loaded Cheesecake", 6.95, "Desserts", "A Piece of Cake", "Creamy baked cheesecake topped with indulgent layers.", [], [], "450 kcal")
    add("Cassatta Slice", 8.95, "Desserts", "Ice Cream", "Layered ice cream with nuts, sponge and tutti frutti.", [], [], "320 kcal")
    add("Traditional Kulfi", 4.95, "Desserts", "Ice Cream", "Dense, slow-set Indian ice cream — 4 flavour choices.", [], [{"name": "Add ice cream", "price": 1.0}], "300 kcal")

    # All Day Breakfast
    add("Bun Omelette", 7.95, "Breakfast", "Desi Bun Brekie", "Soft bun stuffed with masala omelette with choice of toppings.", [], MEAL_ADDONS, "320 kcal")
    add("Bun Maska", 5.95, "Breakfast", "Desi Bun Brekie", "Buttery soft bun with choice of biscoff or jam or nutella.", [], MEAL_ADDONS, "280 kcal", bestseller=True)
    add("Bun Samosa", 8.95, "Breakfast", "Desi Bun Brekie", "Crunchy samosa in bun with chutney & onions.", [], MEAL_ADDONS, "390 kcal")
    add("Omelette Wrap", 7.95, "Breakfast", "Brekkie Wraps", "Fluffy masala omelette wrapped with fresh herbs and sauce in a warm flatbread.", [], MEAL_ADDONS, "380 kcal")
    add("Spiced Chicken & Egg Wrap", 8.95, "Breakfast", "Brekkie Wraps", "Tandoori chicken and masala omelette with onions and chutney.", [], MEAL_ADDONS, "410 kcal — 30g protein")
    add("Bacon & Egg Wrap", 8.95, "Breakfast", "Brekkie Wraps", "Crispy bacon, masala omelette.", [], MEAL_ADDONS, "460 kcal")
    add("Mixed Paratha", 7.95, "Breakfast", "Staples", "Paratha filled with vegetables, served with mint dip.", [], MEAL_ADDONS, "480 kcal", vegan=False)
    add("Aloo Paratha", 7.95, "Breakfast", "Staples", "Paratha filled with spiced potato, served with mint dip.", [], MEAL_ADDONS, "520 kcal")
    add("Brekie Deal", 11.95, "Breakfast", "Combo", "Any wrap, hashbrown & kadak chai or kadak coffee. Available until 3pm.", [], [], "~700 kcal", bestseller=True)

    # All Day Eats
    add("Butter Chicken Bowl", 14.95, "All Day Eats", "Bombay Bowls", "Creamy butter chicken with rice or chips, salad & chutney.", [{"name": "Rice", "price_delta": 0}, {"name": "Chips", "price_delta": 0}], [], "650 kcal", bestseller=True)
    add("Paneer Makhani Bowl", 14.95, "All Day Eats", "Bombay Bowls", "Creamy paneer makhani with rice or chips, salad & chutney.", [{"name": "Rice", "price_delta": 0}, {"name": "Chips", "price_delta": 0}], [], "680 kcal")
    add("Channa Masala Bowl", 13.95, "All Day Eats", "Bombay Bowls", "Spiced chickpea curry with rice or chips, salad & chutney.", [{"name": "Rice", "price_delta": 0}, {"name": "Chips", "price_delta": 0}], [], "560 kcal", vegan=True)
    add("Paneer Sandwich", 13.95, "All Day Eats", "Bombay Toasties", "Creamy schezwan paneer with chaioz spices in toasted bread.", [], [{"name": "Add Fries", "price": 2.95}], "520 kcal")
    add("Classic Bombay", 11.95, "All Day Eats", "Bombay Toasties", "Aloo potato infused with classic spices and green chutney.", [], [{"name": "Add Fries", "price": 2.95}], "520 kcal", vegan=True)
    add("Tandoori Chicken Melt", 12.95, "All Day Eats", "Bombay Toasties", "Chicken with tandoori sauce, melted cheese & mayo toastie.", [], [{"name": "Add Fries", "price": 2.95}], "520 kcal")
    add("Chicken Classic", 13.95, "All Day Eats", "Bombay Toasties", "Pulled chicken with our chaioz recipe in toasted bread.", [], [{"name": "Add Fries", "price": 2.95}], "520 kcal")
    add("Veg Twister Wrap", 11.95, "All Day Eats", "Chaioz Wraps", "Crispy potato tikki with fresh salad and cheesy sauce.", [], [{"name": "Add Fries", "price": 2.95}], "480 kcal", vegan=True)
    add("Paneer Makhani Wrap", 12.95, "All Day Eats", "Chaioz Wraps", "Paneer makhani cubes with fresh salad & mayo.", [], [{"name": "Add Fries", "price": 2.95}], "540 kcal")
    add("Butter Chicken Wrap", 11.95, "All Day Eats", "Chaioz Wraps", "Succulent pulled masala butter chicken in a classic naan.", [], [{"name": "Add Fries", "price": 2.95}], "560 kcal")
    add("Tandoori Chicken Wrap", 12.95, "All Day Eats", "Chaioz Wraps", "Tandoori chicken with onions & minty yoghurt chutney.", [], [{"name": "Add Fries", "price": 2.95}], "600 kcal")

    # Street Food
    add("Masala Chips", 7.95, "Street Food", "Bites", "Fries tossed in Chaioz masala sauce and signature seasoning.", [], [], "420 kcal", vegan=True)
    add("Honey Chilli Cauliflower", 11.95, "Street Food", "Bites", "Crispy cauliflower tossed in sweet-spicy Chaioz sauce.", [], [], "420 kcal", vegan=True)
    add("Samosa Chaat", 11.95, "Street Food", "Bites", "Crushed samosas topped with spiced chickpeas, yogurt, chutneys & onions.", [], [], "420 kcal")
    add("Veg Momos (5pcs)", 9.95, "Street Food", "Bites", "Steamed vegetable dumplings with sweet chilli sauce.", [], [], "300 kcal", vegan=True)
    add("Cheesy Chips", 8.95, "Street Food", "Bites", "Crispy fries in Chaioz cheesy sauce and seasoning.", [], [], "460 kcal")
    add("Aloo Tikki Sliders (2pcs)", 10.95, "Street Food", "Bites", "Mini spiced potato patties in slider buns with chaioz filling.", [], [], "440 kcal", vegan=True)
    add("Aloo Tikki Chaat", 11.95, "Street Food", "Bites", "Crushed spiced potato patties with yogurt, chutneys & onions.", [], [], "390 kcal")
    add("Jalapeño Cheese Bites (6pcs)", 9.95, "Street Food", "Bites", "Crispy bites filled with creamy cheese and a mild jalapeño kick.", [], [], "420 kcal")
    add("Mix Pakode", 9.95, "Street Food", "Bites", "Vegetable fritters topped with Chaioz masala.", [], [], "360 kcal", vegan=True)
    add("Samosa (2pcs)", 7.95, "Street Food", "Bites", "Crispy pastry filled with spiced potato and peas.", [], [], "260 kcal", vegan=True)
    add("Vada Pav", 9.95, "Street Food", "Bites", "Spiced potato fritter in a soft bun with chutneys, Mumbai-style.", [], [], "360 kcal", vegan=True)
    add("Chick-a Boom Bites", 9.95, "Street Food", "Bites", "Crispy chicken bites with a bold, savoury crunch.", [], [], "420 kcal")
    add("Aloo Puff Patty", 7.95, "Street Food", "Puff Patty", "Flaky pastry filled with spiced potato masala.", [], [], "280 kcal", vegan=True)
    add("Paneer Puff Patty", 8.95, "Street Food", "Puff Patty", "Buttery puff pastry stuffed with spiced paneer filling.", [], [], "320 kcal")
    add("Chicken Puff Patty", 8.95, "Street Food", "Puff Patty", "Golden puff pastry filled with seasoned chicken mince. 20g protein.", [], [], "340 kcal")

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
