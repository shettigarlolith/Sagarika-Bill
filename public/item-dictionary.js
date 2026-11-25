/*
 * Sagarika Bill: catering item dictionary and spell check.
 *
 * ITEM_NAMES holds the correct spellings of dishes served at Mangalore /
 * Udupi caterings, including Tulu, Kannada and Konkani names. EVENT_ITEMS
 * covers event management: shamiana, decoration, lighting, furniture,
 * stage, sound, photography and services. Alternative
 * spellings that are both in common use (Payasa / Payasam, Kabab / Kebab)
 * are both listed, so neither is flagged. EXTRA_WORDS are other words that
 * appear on catering bills (sizes, units, services).
 *
 * To add a dish, add its name to ITEM_NAMES in the usual menu spelling.
 *
 * window.SagarikaSpell.check(name) returns a suggested correction, or ''
 * when the name looks fine or nothing close enough is known.
 */
(function () {
  const ITEM_NAMES = [
    // Breakfast and tiffin
    'Neer Dosa', 'Masala Dosa', 'Plain Dosa', 'Set Dosa', 'Rava Dosa', 'Onion Dosa', 'Ghee Roast Dosa',
    'Mysore Masala Dosa', 'Benne Dosa', 'Onion Rava Dosa', 'Paper Dosa', 'Uttappam', 'Pesarattu',
    'Idli', 'Rava Idli', 'Thatte Idli', 'Idli Sambar', 'Moode', 'Kotte', 'Gunda', 'Sanna', 'Sannas',
    'Pundi', 'Pundi Gassi', 'Kadubu', 'Patrode', 'Goli Baje', 'Mangalore Buns', 'Banana Buns',
    'Uppittu', 'Upma', 'Avalakki', 'Poha', 'Shavige', 'Shavige Bath', 'Ottu Shavige', 'Semiya Upma',
    'Kesari Bath', 'Khara Bath', 'Chow Chow Bath', 'Sheera', 'Sajjige', 'Pongal', 'Ven Pongal',
    'Medu Vada', 'Uddina Vade', 'Masala Vada', 'Ambode', 'Sambar Vada', 'Rasam Vada', 'Mosaru Vade',
    'Dahi Vada', 'Bonda', 'Mysore Bonda', 'Aloo Bonda', 'Puri', 'Puri Bhaji', 'Poori', 'Chapati',
    'Chapathi', 'Roti', 'Rotti', 'Akki Rotti', 'Ragi Rotti', 'Kori Rotti', 'Parotta', 'Kerala Parotta',
    'Malabar Parotta', 'Appam', 'Pathiri', 'Bun Sambar', 'Bread Butter', 'Bread Toast', 'Sandwich',
    'Veg Sandwich',

    // Rice
    'Plain Rice', 'White Rice', 'Boiled Rice', 'Red Rice', 'Kuchalakki', 'Steamed Rice', 'Ghee Rice',
    'Jeera Rice', 'Veg Pulao', 'Peas Pulao', 'Kashmiri Pulao', 'Pulav', 'Veg Biryani', 'Chicken Biryani',
    'Mutton Biryani', 'Fish Biryani', 'Prawn Biryani', 'Egg Biryani', 'Paneer Biryani', 'Mushroom Biryani',
    'Dum Biryani', 'Tomato Rice', 'Tomato Bath', 'Lemon Rice', 'Chitranna', 'Puliyogare', 'Tamarind Rice',
    'Curd Rice', 'Mosaranna', 'Bisi Bele Bath', 'Vangi Bath', 'Coconut Rice', 'Fried Rice',
    'Veg Fried Rice', 'Chicken Fried Rice', 'Egg Fried Rice', 'Mixed Fried Rice', 'Schezwan Fried Rice',
    'Jeera Pulao', 'Pulao',

    // Vegetarian curries and sides
    'Sambar', 'Rasam', 'Saaru', 'Tomato Saaru', 'Thili Saaru', 'Pepper Rasam', 'Tomato Rasam',
    'Dal', 'Dal Fry', 'Dal Tadka', 'Dal Makhani', 'Majjige Huli', 'Menaskai', 'Gassi', 'Veg Gassi',
    'Kadle Gassi', 'Alasande Gassi', 'Bendekai Gassi', 'Southekai Gassi', 'Kadle Manoli', 'Kadle Sukka',
    'Veg Sukka', 'Gujje Sukka', 'Gujje Ajadina', 'Ajadina', 'Upkari', 'Ambat', 'Palya', 'Beans Palya',
    'Cabbage Palya', 'Carrot Palya', 'Thondekai Palya', 'Kosambari', 'Kosumbari', 'Gojju',
    'Pineapple Gojju', 'Pachadi', 'Thambuli', 'Huli', 'Koddel', 'Kootu', 'Avial', 'Aviyal',
    'Mixed Veg Curry', 'Veg Kurma', 'Veg Korma', 'Veg Kolhapuri', 'Veg Jalfrezi', 'Paneer Butter Masala',
    'Kadai Paneer', 'Palak Paneer', 'Paneer Tikka', 'Paneer Tikka Masala', 'Paneer Chilli',
    'Chilli Paneer', 'Mutter Paneer', 'Aloo Gobi', 'Aloo Mutter', 'Chana Masala', 'Rajma',
    'Gobi Manchurian', 'Gobi Manchuri', 'Mushroom Manchurian', 'Baby Corn Manchurian', 'Gobi 65',
    'Mushroom Pepper Fry', 'Kanile Sukka', 'Kesuvina Ele', 'Pathrode', 'Raita', 'Onion Raita',
    'Cucumber Raita', 'Salad', 'Green Salad', 'Pickle', 'Uppinakai', 'Papad', 'Happala', 'Sandige',
    'Chutney', 'Coconut Chutney', 'Chutney Pudi', 'Ghee', 'Curd', 'Mosaru', 'Butter',

    // Chicken
    'Ghee Roast', 'Chicken Ghee Roast', 'Chicken Sukka', 'Kori Sukka', 'Kori Gassi', 'Chicken Curry', 'Chicken Gassi',
    'Chicken Kabab', 'Chicken Kebab', 'Chicken 65', 'Chicken Lollipop', 'Chilli Chicken',
    'Chicken Chilli', 'Chicken Manchurian', 'Butter Chicken', 'Chicken Tikka', 'Tandoori Chicken',
    'Pepper Chicken', 'Chicken Pepper Fry', 'Chicken Fry', 'Chicken Masala', 'Chicken Kurma',
    'Chicken Korma', 'Chicken Kolhapuri', 'Chicken Hyderabadi', 'Chicken Malai Tikka', 'Chicken Roll',
    'Chicken Cutlet', 'Chicken Sukka Boneless', 'Chicken Ajadina',

    // Mutton, egg and pork
    'Mutton Ghee Roast', 'Mutton Sukka', 'Mutton Curry', 'Mutton Gassi', 'Mutton Pepper Fry',
    'Mutton Chops', 'Mutton Kurma', 'Mutton Korma', 'Mutton Fry', 'Mutton Masala', 'Mutton Kheema',
    'Kheema', 'Egg Curry', 'Egg Gassi', 'Egg Masala', 'Egg Burji', 'Egg Bhurji', 'Boiled Egg', 'Omelette',
    'Egg Chilli', 'Pork Bafat', 'Pork Sorpotel', 'Pork Indad', 'Pork Fry', 'Beef Fry', 'Beef Sukka',

    // Fish and seafood (Mangalore names)
    'Fish Fry', 'Fish Curry', 'Fish Gassi', 'Fish Tawa Fry', 'Fish Rava Fry', 'Fish Masala Fry',
    'Fish Pulimunchi', 'Fish Ghee Roast', 'Fish Thali', 'Meen Fry', 'Meen Gassi', 'Meen Curry',
    'Bangude Fry', 'Bangude Pulimunchi', 'Bangude Gassi', 'Bangude Rava Fry', 'Mackerel Fry',
    'Anjal Fry', 'Anjal Tawa Fry', 'Anjal Rava Fry', 'Anjal Masala Fry', 'Anjal Gassi', 'Seer Fish Fry',
    'Kingfish Fry', 'Pomfret Fry', 'Pomfret Tawa Fry', 'Pomfret Rava Fry', 'Pomfret Gassi', 'Manji Fry',
    'Boothai Fry', 'Boothai Gassi', 'Boothai Pulimunchi', 'Sardine Fry', 'Kane Fry', 'Kane Rava Fry',
    'Kane Masala Fry', 'Ladyfish Fry', 'Prawn Ghee Roast', 'Prawns Ghee Roast', 'Prawn Sukka',
    'Prawn Gassi', 'Prawn Fry', 'Prawn Rava Fry', 'Prawn Masala', 'Prawns Fry', 'Yetti Sukka',
    'Yetti Gassi', 'Crab Ghee Roast', 'Crab Sukka', 'Crab Masala', 'Crab Curry', 'Denji Gassi',
    'Denji Sukka', 'Squid Fry', 'Squid Sukka', 'Squid Ghee Roast', 'Marvai Sukka', 'Marvai Gassi',
    'Clams Sukka', 'Mussels Fry', 'Tuna Fry', 'Shark Fry', 'Fish Finger', 'Fish Cutlet',

    // Starters and snacks
    'Bajji', 'Mirchi Bajji', 'Onion Bajji', 'Aloo Bajji', 'Pakoda', 'Pakora', 'Onion Pakoda',
    'Cashew Pakoda', 'Veg Pakoda', 'Veg Cutlet', 'Cutlet', 'Samosa', 'Veg Samosa', 'Spring Roll',
    'Veg Spring Roll', 'Kachori', 'Banana Chips', 'Masala Puri', 'Pani Puri', 'Bhel Puri', 'Sev Puri',
    'Dahi Puri', 'Chaat', 'Momos', 'Veg Momos', 'French Fries', 'Finger Chips', 'Corn', 'Sweet Corn',
    'Masala Corn', 'Peanut Masala', 'Mixture', 'Chakli', 'Chakkuli', 'Kodubale', 'Nippattu',
    'Kodubale Nippattu', 'Biscuit', 'Cake', 'Cookies', 'Puffs', 'Veg Puffs', 'Egg Puffs',

    // Sweets and desserts
    'Payasa', 'Payasam', 'Kheer', 'Ada Pradhaman', 'Shavige Payasa', 'Semiya Payasam',
    'Kadale Bele Payasa', 'Hesaru Bele Payasa', 'Moong Dal Payasam', 'Gasagase Payasa',
    'Sabakki Payasa', 'Sago Payasam', 'Halbai', 'Halwa', 'Mangalore Halwa', 'Carrot Halwa', 'Gajar Halwa',
    'Kashi Halwa', 'Bread Halwa', 'Godhi Halwa', 'Badam Halwa', 'Moong Dal Halwa', 'Kesari', 'Rava Kesari',
    'Holige', 'Obbattu', 'Puran Poli', 'Mysore Pak', 'Laddu', 'Ladoo', 'Boondi Laddu', 'Motichoor Laddu',
    'Rava Laddu', 'Besan Laddu', 'Jalebi', 'Jangiri', 'Imarti', 'Gulab Jamun', 'Rasmalai', 'Rasgulla',
    'Badam Puri', 'Chiroti', 'Kajjaya', 'Patholi', 'Gadbad', 'Gadbad Ice Cream', 'Pabbas', 'Ice Cream',
    'Vanilla Ice Cream', 'Fruit Salad', 'Fruit Salad With Ice Cream', 'Custard', 'Fruit Custard',
    'Caramel Pudding', 'Pudding', 'Kulfi', 'Basundi', 'Shrikhand', 'Sheer Kurma', 'Kaju Katli',
    'Kaju Barfi', 'Barfi', 'Coconut Barfi', 'Kobbari Mithai', 'Peda', 'Dharwad Peda', 'Sweet', 'Sweets',
    'Mixed Sweets', 'Banana', 'Fruits', 'Beeda', 'Paan', 'Sweet Paan', 'Mouth Freshener',

    // Drinks
    'Tea', 'Coffee', 'Filter Coffee', 'Black Coffee', 'Lemon Tea', 'Masala Tea', 'Green Tea', 'Milk',
    'Badam Milk', 'Rose Milk', 'Lime Juice', 'Lemon Juice', 'Lime Soda', 'Fresh Lime Soda', 'Buttermilk',
    'Majjige', 'Neer Majjige', 'Lassi', 'Sweet Lassi', 'Mango Lassi', 'Panaka', 'Kokum Juice',
    'Kokum Sherbet', 'Punarpuli Juice', 'Sol Kadi', 'Welcome Drink', 'Fresh Juice', 'Pineapple Juice',
    'Watermelon Juice', 'Mango Juice', 'Grape Juice', 'Orange Juice', 'Mosambi Juice', 'Mojito',
    'Virgin Mojito', 'Milkshake', 'Mango Milkshake', 'Chocolate Milkshake', 'Falooda', 'Tender Coconut',
    'Mineral Water', 'Water Bottle', 'Soft Drinks', 'Soda',

    // Meals and packages
    'Veg Meals', 'Non Veg Meals', 'Fish Meals', 'Chicken Meals', 'Mini Meals', 'South Indian Meals',
    'North Indian Meals', 'Thali', 'Veg Thali', 'Non Veg Thali', 'Lunch', 'Dinner', 'Breakfast',
    'High Tea', 'Buffet', 'Banana Leaf Meals', 'Parcel Meals', 'Meals'
  ];

  const EXTRA_WORDS = [
    'full', 'half', 'quarter', 'plate', 'plates', 'kg', 'kgs', 'gram', 'grams', 'litre', 'litres',
    'ltr', 'ml', 'pcs', 'piece', 'pieces', 'nos', 'per', 'head', 'person', 'persons', 'pax', 'parcel',
    'special', 'mini', 'large', 'medium', 'small', 'extra', 'combo', 'veg', 'non', 'nonveg', 'boneless',
    'with', 'without', 'and', 'bottle', 'bottles', 'cup', 'cups', 'glass', 'glasses', 'box', 'boxes',
    'pack', 'packet', 'packets', 'family', 'jumbo', 'regular', 'hot', 'cold', 'fresh', 'plain', 'mixed',
    'mix', 'dry', 'gravy', 'masala', 'fry', 'curry', 'roast', 'item', 'items', 'service', 'services',
    'charge', 'charges', 'rent', 'hall', 'table', 'tables', 'chair', 'chairs', 'leaf', 'leaves', 'counter',
    'live', 'staff', 'serving', 'server', 'servers', 'waiter', 'waiters', 'cook', 'cooking', 'transport',
    'delivery', 'decoration', 'shamiana', 'pandal', 'vessel', 'vessels', 'gas', 'water', 'ice', 'tips',
    'advance', 'balance', 'discount', 'gst', 'tax', 'total', 'extra', 'portion', 'tray', 'trays', 'tiffin',
    'snacks', 'starter', 'starters', 'dessert', 'desserts', 'juice', 'soup', 'tomato', 'sweet', 'corn',
    'mushroom', 'manchow', 'hot', 'sour', 'clear', 'cream', 'of', 'the', 'in', 'on', 'for', 'a', 'to',
    'mangalore', 'mangalorean', 'udupi', 'kerala', 'malabar', 'mysore', 'kundapur', 'kundapura',
    'chinese', 'tandoori', 'north', 'south', 'indian', 'continental', 'paper', 'disposable', 'glasses',
    'spoon', 'spoons', 'tissue', 'napkin', 'napkins', 'cover', 'covers', 'carry', 'bag', 'bags',
    // Provisions and household items caterers also buy and bill
    'soap', 'shampoo', 'detergent', 'oil', 'cooking', 'coconut', 'sugar', 'salt', 'jaggery', 'bella',
    'flour', 'wheat', 'atta', 'maida', 'rava', 'sooji', 'besan', 'powder', 'chilli', 'turmeric',
    'coriander', 'jeera', 'pepper', 'mustard', 'tamarind', 'onion', 'onions', 'potato', 'potatoes',
    'garlic', 'ginger', 'vegetables', 'vegetable', 'fruits', 'eggs', 'cylinder', 'charcoal', 'firewood',
    'foil', 'aluminium', 'container', 'containers', 'cubes', 'provisions', 'grocery', 'groceries',
    'cleaning', 'washing', 'dishwash', 'phenyl', 'broom', 'mop', 'gloves', 'cap', 'caps', 'apron',
    // Event management words used in longer item names
    'wedding', 'reception', 'engagement', 'birthday', 'anniversary', 'function', 'ceremony', 'naming',
    'housewarming', 'gruhapravesha', 'upanayana', 'mehendi', 'haldi', 'sangeet', 'muhurtha', 'nischitartha',
    'seemantha', 'baby', 'shower', 'party', 'corporate', 'meeting', 'conference', 'seminar', 'event',
    'events', 'theme', 'premium', 'deluxe', 'standard', 'basic', 'royal', 'golden', 'silver', 'white',
    'red', 'yellow', 'pink', 'blue', 'green', 'orange', 'gold', 'cloth', 'fabric', 'velvet', 'satin',
    'wooden', 'iron', 'steel', 'glass', 'plastic', 'fiber', 'set', 'sets', 'unit', 'units', 'day', 'days',
    'night', 'hour', 'hours', 'sqft', 'feet', 'ft', 'meter', 'meters', 'rent', 'rental', 'hire',
    'setup', 'installation', 'dismantling', 'operator', 'technician', 'helper', 'helpers', 'boys',
    'girls', 'bride', 'groom', 'couple', 'entrance', 'exit', 'main', 'side', 'front', 'back', 'inner',
    'outer', 'indoor', 'outdoor', 'big', 'package', 'packages', 'charges', 'per', 'each', 'only'
  ];

  const SOUPS = ['Tomato Soup', 'Sweet Corn Soup', 'Veg Soup', 'Chicken Soup', 'Mutton Soup', 'Manchow Soup',
    'Hot And Sour Soup', 'Clear Soup', 'Cream Of Mushroom Soup', 'Mutton Paya', 'Rasam Soup'];

  // Event management: tents, decoration, lighting, furniture, stage, sound and services.
  const EVENT_ITEMS = [
    // Shamiana, tents and pandal
    'Shamiana', 'Shamiyana', 'Pandal', 'Chappara', 'Tent', 'German Tent', 'Hangar Tent', 'Dome Tent',
    'Waterproof Tent', 'Shamiana Rent', 'Pandal Rent', 'Tent Rent', 'Side Curtain', 'Side Wall',
    'Ceiling Cloth', 'Ceiling Decoration', 'Carpet', 'Red Carpet', 'Mat', 'Floor Mat', 'Coir Mat',
    'Flooring', 'Wooden Flooring', 'Entrance Arch', 'Arch', 'Welcome Arch', 'Welcome Board', 'Banner',
    'Flex Banner', 'Flex Board', 'Name Board', 'Signage',

    // Decoration
    'Decoration', 'Decorations', 'Stage Decoration', 'Hall Decoration', 'Mandap', 'Mandap Decoration',
    'Wedding Mandap', 'Flower Decoration', 'Fresh Flower Decoration', 'Artificial Flower Decoration',
    'Flower Garland', 'Garland', 'Hara', 'Jasmine', 'Mallige', 'Rose Petals', 'Marigold', 'Chendu Hoovu',
    'Kalash', 'Kalasha', 'Toran', 'Thorana', 'Mango Leaves', 'Banana Plant', 'Banana Stem',
    'Coconut Leaves', 'Areca Plant', 'Rangoli', 'Flower Rangoli', 'Balloon Decoration', 'Balloon Arch',
    'Balloons', 'Backdrop', 'Stage Backdrop', 'Photo Booth', 'Selfie Booth', 'Selfie Point',
    'Theme Decoration', 'Birthday Decoration', 'Car Decoration', 'Entrance Decoration', 'Table Decoration',
    'Centerpiece', 'Centrepiece', 'Drapes', 'Draping', 'Fabric Draping', 'Curtains', 'Netting',
    'Haldi Decoration', 'Mehendi Decoration', 'Sangeet Decoration', 'Reception Decoration',
    'Engagement Decoration', 'Naming Ceremony Decoration', 'Cradle Decoration', 'Seemantha Decoration',

    // Lighting
    'Lighting', 'Lights', 'Serial Lights', 'Fairy Lights', 'LED Lights', 'LED Par Lights', 'Par Lights',
    'Halogen Lights', 'Focus Lights', 'Spot Lights', 'Moving Head Lights', 'Sharpy Lights',
    'Chandelier', 'Chandeliers', 'Lantern', 'Lanterns', 'Tube Lights', 'Bulb Lights', 'Rice Lights',
    'Pixel Lights', 'Laser Lights', 'Uplighting', 'Stage Lighting', 'Pathway Lights', 'Garden Lights',
    'Diya', 'Diyas', 'Candles', 'Lamp', 'Nilavilakku', 'Kuthu Deepa', 'Deepa', 'Generator',
    'Generator Rent', 'Diesel', 'Electricity Charges', 'Electrician', 'Wiring', 'Extension Board',

    // Furniture
    'Table', 'Tables', 'Chair', 'Chairs', 'Plastic Chair', 'Plastic Chairs', 'Cushion Chair',
    'Cushion Chairs', 'Chair Cover', 'Chair Covers', 'Chair Bow', 'Banquet Chair', 'Tiffany Chair',
    'Round Table', 'Round Tables', 'Rectangle Table', 'Dining Table', 'Dining Tables', 'Buffet Table',
    'Cocktail Table', 'Table Cover', 'Table Covers', 'Table Cloth', 'Table Skirting', 'Skirting',
    'Sofa', 'Sofas', 'Stage Sofa', 'Wedding Sofa', 'Maharaja Chair', 'Throne Chair', 'Couple Chair',
    'Bride Groom Chair', 'Sofa Set', 'Coffee Table', 'Teapoy', 'Stool', 'Podium', 'Lectern', 'Cot',
    'Bench', 'Benches', 'Rack', 'Counter Table',

    // Stage, sound and AV
    'Stage', 'Stage Rent', 'Stage Platform', 'Ramp', 'Stage Steps', 'Truss', 'Truss Structure',
    'Sound System', 'Sound', 'Speakers', 'Speaker', 'Mic', 'Mike', 'Microphone', 'Cordless Mic',
    'Collar Mic', 'Amplifier', 'Mixer', 'DJ', 'DJ Night', 'DJ Console', 'LED Wall', 'LED Screen',
    'Projector', 'Projector Screen', 'Television', 'Live Streaming', 'Band', 'Chende', 'Chenda',
    'Nadaswara', 'Nadaswaram', 'Nagaswara', 'Shehnai', 'Orchestra', 'Live Music', 'Anchor', 'Emcee',
    'Fog Machine', 'Smoke Machine', 'Cold Pyro', 'Sparkular', 'Confetti', 'Confetti Blast', 'Fireworks',
    'Bubble Machine',

    // Photography and entertainment
    'Photography', 'Photographer', 'Videography', 'Videographer', 'Candid Photography', 'Drone',
    'Drone Shoot', 'Album', 'Photo Album', 'Pre Wedding Shoot', 'Live Telecast', 'Mehendi Artist',
    'Makeup', 'Makeup Artist', 'Bridal Makeup', 'Magician', 'Clown', 'Games', 'Kids Games',
    'Bouncy Castle', 'Tattoo Artist', 'Caricature Artist', 'Yakshagana', 'Huli Vesha', 'Pili Vesha',
    'Dollu Kunitha', 'Dance Performance',

    // Services, staff and logistics
    'Event Management', 'Event Planning', 'Event Coordinator', 'Wedding Planner', 'Hall Rent',
    'Hall Booking', 'Venue', 'Venue Rent', 'Lawn', 'Garden', 'Parking', 'Valet Parking', 'Security',
    'Security Guard', 'Bouncers', 'Housekeeping', 'Cleaning Charges', 'Serving Staff',
    'Service Charges', 'Labour Charges', 'Loading Charges', 'Unloading Charges', 'Transport Charges',
    'Vehicle Rent', 'Tempo', 'Lorry', 'Water Tanker', 'Drinking Water', 'Water Can', 'Water Cans',
    'Mobile Toilet', 'Cooler', 'Air Cooler', 'Fan', 'Fans', 'Pedestal Fan', 'Mist Fan', 'Air Conditioner',
    'AC Charges', 'Invitation', 'Invitation Card', 'Invitation Cards', 'Return Gift', 'Return Gifts',
    'Gift Packing', 'Thamboola', 'Tambula', 'Betel Leaves', 'Pooja Items', 'Pooja Materials', 'Priest',
    'Purohit', 'Cake Cutting', 'Welcome Girls', 'Ushers', 'Hostess', 'Reception Counter', 'Coat Stand',
    'Dustbin', 'Dustbins', 'Waste Disposal', 'Insurance', 'Advance', 'Balance Amount'
  ];

  // Everyday words that also appear on bills. They are correct as typed and
  // must never be "corrected" into a dish (e.g. Cheese -> Chende, Room -> Groom).
  const COMMON_WORDS = (
    // Provisions, dairy and spices
    'cheese jam honey sauce ketchup mayonnaise vinegar yogurt cream paneer dalda ghee butter milk curd ' +
    'rava atta maida besan ragi jowar bajra toor urad moong chana masoor rajma cashew badam almond pista ' +
    'raisins dates saffron cardamom elaichi clove cloves cinnamon bay fennel ajwain hing methi mint pudina ' +
    'curry leaves coriander dhania jeera sunflower groundnut mustard gingelly refined jaggery honey noodles ' +
    'pasta bread cake pizza burger sandwich biscuit cookies chocolate candy toffee sugar salt rock ' +
    // Vegetables and fruits
    'palak brinjal cauliflower cabbage beans carrot beetroot capsicum drumstick pumpkin cucumber radish ' +
    'ladies finger bitter snake ridge bottle ash gourd yam colocasia raw banana mango apple grapes orange ' +
    'papaya pineapple watermelon muskmelon pomegranate guava chikoo sapota jackfruit lemon lime tender ' +
    'tomato onion potato garlic ginger chilli chillies peas corn mushroom spinach greens leafy sprouts ' +
    // Drinks and brands
    'coke pepsi sprite fanta maaza bisleri kinley amul nandini thums limca frooti slice ' +
    // Utensils, kitchen and serving
    'ladle tray lid pot pan stove burner vessel drum barrel tank pipe hose bucket mug jug flask kettle ' +
    'thermos freezer fridge refrigerator oven grill tandoor kadai handi wok bowl bowls fork knife knives ' +
    'spoon plate tumbler steel copper brass chafing dish dishes ' +
    // Household, hardware and decoration supplies
    'rope nails tape glue wire bulb bulbs switch plug cable towel bed pillow blanket mattress saree shawl ' +
    'gift gifts card cards flower flowers block blocks box sheet sheets ' +
    // Transport, money and places
    'labour coolie driver petrol toll cash online upi cheque bank room rooms ac cottage dormitory kitchen ' +
    'store backup pickup drop taxi auto bus car van jeep tempo lorry truck bike ' +
    // General words seen on event and catering bills
    'hand wash power bank charger charging cord cords sand bags bag clamp clamps clip clips hook hooks rod ' +
    'rods pagoda gazebo canopy umbrella tarpaulin sheet plywood bamboo stick sticks pole poles frame frames ' +
    'mirror torch battery batteries inverter ups printer printing xerox lamination envelope sticker ' +
    'stickers ribbon ribbons glitter bouquet bangles cone cones sugarcane bunch betel nut nuts camphor ' +
    'incense agarbathi kumkum sindoor haldi turmeric coil mosquito sanitizer garbage film cling silver foil ' +
    'shake shakes brownie donut muffin waffle pancake nachos popcorn lollipop gola stick lemonade iced ' +
    'shawarma roll rolls wrap wraps frankie bouncer zip ties velcro thermocol cutout cutouts board boards ' +
    'stand stands holder holders basket baskets tub tubs jar jars bottle cap lid lids'
  ).split(/\s+/);

  const ALL_NAMES = [...ITEM_NAMES, ...SOUPS, ...EVENT_ITEMS];

  function squash(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function words(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean);
  }

  // Correct spelling (with capitals) for each known word, keyed by lower case.
  const WORD_FORMS = new Map();
  ALL_NAMES.forEach((name) => {
    words(name).forEach((w) => {
      const key = w.toLowerCase();
      if (!WORD_FORMS.has(key)) WORD_FORMS.set(key, w);
    });
  });
  EXTRA_WORDS.forEach((w) => {
    if (!WORD_FORMS.has(w)) WORD_FORMS.set(w, w.length <= 3 && w !== 'veg' && w !== 'non' ? w : w[0].toUpperCase() + w.slice(1));
  });
  COMMON_WORDS.forEach((w) => {
    if (!WORD_FORMS.has(w)) WORD_FORMS.set(w, w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1));
  });
  // Only words of 4+ letters are offered as corrections ("Fork" must not become "for").
  const WORD_LIST = [...WORD_FORMS.keys()].filter((w) => w.length >= 4);

  // Whole names keyed without spaces, so "neerdosa" and "Neer  dosa" both find "Neer Dosa".
  const NAME_BY_SQUASH = new Map();
  ALL_NAMES.forEach((name) => NAME_BY_SQUASH.set(squash(name), name));

  // Damerau-Levenshtein distance (a swap of two letters counts as one mistake), capped for speed.
  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const rows = a.length + 1;
    const cols = b.length + 1;
    const d = Array.from({ length: rows }, (_, i) => {
      const row = new Array(cols).fill(0);
      row[0] = i;
      return row;
    });
    for (let j = 0; j < cols; j += 1) d[0][j] = j;
    for (let i = 1; i < rows; i += 1) {
      let rowMin = Infinity;
      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
        rowMin = Math.min(rowMin, d[i][j]);
      }
      if (rowMin > max) return max + 1;
    }
    return d[a.length][b.length];
  }

  // How many typing mistakes to allow. Kept low so real words are not "corrected".
  function allowedMistakes(length) {
    if (length <= 3) return 0;
    if (length <= 7) return 1;
    if (length <= 12) return 2;
    return 3;
  }

  function sameLetters(a, b) {
    return a.split('').sort().join('') === b.split('').sort().join('');
  }

  function closest(target, candidates) {
    const max = allowedMistakes(target.length);
    if (max === 0) return '';
    let best = '';
    let bestScore = Infinity;
    candidates.forEach((candidate) => {
      // People rarely mistype the first letter, so a different first letter is a different word.
      if (candidate[0] !== target[0]) return;
      const dist = distance(target, candidate, max);
      if (dist > max) return;
      // In short words a changed letter usually makes another real word (Coke/Cake, Mint/Mini),
      // so only allow a missing, extra or swapped letter there.
      if (target.length <= 5 && candidate.length === target.length && !sameLetters(target, candidate)) return;
      const score = dist * 10 + Math.abs(candidate.length - target.length);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    });
    return best;
  }

  const SQUASHED_NAMES = [...NAME_BY_SQUASH.keys()];

  // A word is fine if it is known, a plural of a known word, a number or a size.
  function isKnownWord(word) {
    if (/[0-9]/.test(word) || /[^A-Za-z]/.test(word)) return true;
    const key = word.toLowerCase();
    if (WORD_FORMS.has(key)) return true;
    if (key.endsWith('es') && WORD_FORMS.has(key.slice(0, -2))) return true;
    if (key.endsWith('s') && WORD_FORMS.has(key.slice(0, -1))) return true;
    // Singular of a known plural ("Light" from "Lights").
    return key.length > 3 && (WORD_FORMS.has(`${key}s`) || WORD_FORMS.has(`${key}es`));
  }

  // Short-hand spellings people often type, mapped to the proper word.
  const SHORT_HAND = { lite: 'Light', lites: 'Lights', nite: 'Night', thru: 'Through', pcs: 'pcs', hav: 'Have' };

  function fixWord(word) {
    const key = word.toLowerCase();
    if (SHORT_HAND[key]) return SHORT_HAND[key];
    // Keep numbers, sizes like 1kg / 500ml, symbols and plurals of known words as typed.
    if (isKnownWord(word)) return word;
    const match = closest(key, WORD_LIST);
    return match ? WORD_FORMS.get(match) : word;
  }

  /**
   * Returns the suggested spelling for an item name, or '' if it already
   * looks right (or nothing known is close enough to suggest).
   */
  // Follow the user's own style: ALL CAPS stays all caps, all lower stays lower.
  function matchCase(suggestion, original) {
    const letters = original.replace(/[^A-Za-z]/g, '');
    if (letters.length > 1 && letters === letters.toUpperCase()) return suggestion.toUpperCase();
    if (letters.length > 1 && letters === letters.toLowerCase()) return suggestion.toLowerCase();
    return suggestion;
  }

  function check(rawName) {
    const name = String(rawName || '').replace(/\s+/g, ' ').trim();
    if (!name) return '';
    const sameIgnoringCase = (a) => a.toLowerCase() === name.toLowerCase();
    let suggestion = '';

    const squashed = squash(name);
    const exact = NAME_BY_SQUASH.get(squashed);
    const allWordsKnown = words(name).every(isKnownWord);
    if (exact) {
      // 1. A known dish; only the spacing can be off ("Neerdosa"). Capitals are left alone.
      suggestion = exact;
    } else if (allWordsKnown) {
      // Every word is a real word. Only suggest a dish that is one letter away
      // ("Kori Roti" -> "Kori Rotti"), never just for a plural ("Biscuits").
      // Only a missing or extra letter, with the same first letter (not Grapes -> Drapes).
      const near = SQUASHED_NAMES.find(
        (candidate) =>
          candidate[0] === squashed[0] &&
          Math.abs(candidate.length - squashed.length) === 1 &&
          distance(squashed, candidate, 1) <= 1
      );
      const isPlural =
        near && [`${near}s`, `${near}es`].includes(squashed) || [`${squashed}s`, `${squashed}es`].includes(near);
      if (!near || isPlural || squashed.length < 6) return '';
      suggestion = NAME_BY_SQUASH.get(near);
    } else if (!/[0-9]/.test(name) && closest(squashed, SQUASHED_NAMES)) {
      // 2. The whole name is a close misspelling of a known dish.
      suggestion = NAME_BY_SQUASH.get(closest(squashed, SQUASHED_NAMES));
    } else {
      // 3. Fix word by word, keeping unknown words (your own specials) as typed.
      suggestion = words(name).map(fixWord).join(' ');
    }

    if (!suggestion || sameIgnoringCase(suggestion)) return '';
    return matchCase(suggestion, name);
  }

  /*
   * Short meanings shown in the grey popup. Keys are lower case and may be a
   * whole name ("neer dosa") or a word/phrase used inside names ("pulimunchi",
   * "tawa fry"). Well-known items (Chicken Biryani, Chairs) need no meaning.
   */
  const MEANINGS = {
    // Breakfast and tiffin
    'neer dosa': 'Thin, soft, lace-like crepe made from a watery rice batter. A Mangalore speciality.',
    'goli baje': 'Soft, fluffy deep-fried fritters made from maida and curd. Also called Mangalore Bajji.',
    'patrode': 'Colocasia (taro) leaves rolled with a spicy rice-coconut paste, steamed and sliced.',
    'pathrode': 'Colocasia (taro) leaves rolled with a spicy rice-coconut paste, steamed and sliced.',
    'moode': 'Idli steamed in cylinders of screw-pine (kedige) leaves, with a light fragrance.',
    'kotte': 'Idli batter steamed in cups made of jackfruit leaves.',
    'sannas': 'Soft, spongy, slightly sweet steamed rice cakes (Mangalorean Catholic).',
    'pundi': 'Steamed rice dumplings, also called Undi. Often served with Gassi.',
    'kadubu': 'Steamed dumplings or idli, often cooked in leaves.',
    'mangalore buns': 'Slightly sweet, fluffy deep-fried puris made with ripe banana.',
    'banana buns': 'Slightly sweet, fluffy deep-fried puris made with ripe banana.',
    'uppittu': 'Upma: savoury semolina (rava) dish.',
    'avalakki': 'Poha: dish made from flattened rice.',
    'shavige': 'Rice noodles or vermicelli (Semiya).',
    'ottu shavige': 'Fresh rice noodles pressed out of steamed rice dough.',
    'kesari bath': 'Sweet semolina dessert with ghee, sugar and saffron colour.',
    'khara bath': 'Spicy vegetable upma.',
    'chow chow bath': 'Kesari Bath and Khara Bath served together.',
    'sajjige': 'Semolina (rava) dish, like upma or sheera.',
    'ambode': 'Crispy chana dal fritters (Masala Vada).',
    'mosaru vade': 'Dahi Vada: urad dal vada soaked in seasoned curd.',
    'uddina vade': 'Medu Vada: crispy urad dal doughnut.',
    'akki rotti': 'Flatbread made from rice flour.',
    'ragi rotti': 'Flatbread made from finger millet (ragi) flour.',
    'pathiri': 'Thin rice-flour flatbread from Malabar.',
    'pesarattu': 'Green moong dal dosa.',
    'thatte idli': 'Large, flat plate-shaped idli.',

    // Rice
    'kuchalakki': 'Boiled (parboiled) red rice, popular in coastal Karnataka.',
    'chitranna': 'Lemon rice.',
    'puliyogare': 'Tamarind rice.',
    'mosaranna': 'Curd rice.',
    'bisi bele bath': 'Hot, spicy dish of rice, lentils and vegetables from Karnataka.',
    'vangi bath': 'Brinjal rice.',

    // Curries and sides
    'saaru': 'Rasam: thin, spiced lentil or tomato soup.',
    'thili saaru': 'Clear, thin rasam.',
    'majjige huli': 'Buttermilk curry with vegetables and a coconut-mustard paste.',
    'menaskai': 'Sweet, sour and spicy coastal gravy, often with pineapple or raw mango.',
    'gassi': 'Mangalorean coconut curry with roasted red chillies.',
    'kadle manoli': 'Ivy gourd (Manoli) and black chickpeas (Kadle) in coconut masala.',
    'kadle': 'Black chickpeas.',
    'manoli': 'Ivy gourd (Tondekai).',
    'alasande': 'Black-eyed beans or long beans.',
    'bendekai': 'Ladies finger (okra).',
    'southekai': 'Mangalore cucumber.',
    'thondekai': 'Ivy gourd.',
    'sukka': 'Dry dish coated in roasted coconut and spices.',
    'gujje': 'Raw (tender) jackfruit.',
    'ajadina': 'Dry stir-fry with grated coconut (Tulu).',
    'upkari': 'Simple Konkani stir-fry of vegetables.',
    'ambat': 'Konkani coconut-based curry.',
    'palya': 'Dry vegetable stir-fry with coconut.',
    'kosambari': 'Salad of soaked moong dal with cucumber or carrot and coconut.',
    'kosumbari': 'Salad of soaked moong dal with cucumber or carrot and coconut.',
    'gojju': 'Thick sweet, sour and spicy gravy.',
    'pachadi': 'Curd-based side dish or tangy relish.',
    'thambuli': 'Cool curd-based side dish with herbs or vegetables.',
    'huli': 'Sambar.',
    'koddel': 'Coastal-style sambar with coconut and vegetables.',
    'kootu': 'Lentil and vegetable stew.',
    'avial': 'Mixed vegetables in coconut and curd, from Kerala.',
    'aviyal': 'Mixed vegetables in coconut and curd, from Kerala.',
    'kanile': 'Tender bamboo shoot.',
    'kesuvina ele': 'Colocasia leaves.',
    'uppinakai': 'Pickle.',
    'happala': 'Papad.',
    'sandige': 'Sun-dried crisps, fried before serving.',
    'chutney pudi': 'Dry chutney powder.',
    'mosaru': 'Curd.',

    // Meat and fish words
    'kori': 'Chicken (Tulu).',
    'kori rotti': 'Mangalorean chicken curry (Kori) served with crisp, dry rice wafers (Rotti).',
    'ghee roast': 'Fiery red Mangalorean dish roasted in ghee with Byadgi chillies and spices.',
    'pulimunchi': 'Sour and spicy dish with tamarind and red chillies.',
    'bangude': 'Mackerel (fish).',
    'anjal': 'Seer fish / kingfish.',
    'manji': 'Pomfret (fish).',
    'boothai': 'Sardine (fish).',
    'kane': 'Ladyfish.',
    'yetti': 'Prawns (Tulu).',
    'denji': 'Crab (Tulu).',
    'marvai': 'Clams.',
    'meen': 'Fish.',
    'tawa fry': 'Shallow-fried on a flat iron pan with masala.',
    'rava fry': 'Coated in semolina (rava) and pan-fried until crisp.',
    'bafat': 'Spicy, tangy Mangalorean Catholic pork curry made with bafat masala.',
    'sorpotel': 'Spicy, vinegary pork dish from Mangalorean and Goan Catholic cooking.',
    'indad': 'Sweet, sour and spicy pork curry (Mangalorean Catholic).',
    'kheema': 'Minced meat.',
    'burji': 'Scrambled (e.g. scrambled egg).',
    'bhurji': 'Scrambled (e.g. scrambled egg).',

    // Sweets and drinks
    'halbai': 'Soft sweet made from rice (or ragi), jaggery and coconut.',
    'kashi halwa': 'Sweet made from ash gourd.',
    'godhi halwa': 'Wheat halwa.',
    'holige': 'Sweet flatbread stuffed with chana dal and jaggery (Puran Poli).',
    'obbattu': 'Sweet flatbread stuffed with chana dal and jaggery (Puran Poli).',
    'chiroti': 'Flaky, layered fried sweet dusted with sugar.',
    'kajjaya': 'Deep-fried sweet of rice flour and jaggery.',
    'patholi': 'Rice dumplings steamed in turmeric leaves with a coconut-jaggery filling.',
    'gadbad': 'Mangalore layered ice-cream sundae with fruit, jelly and nuts.',
    'payasa': 'Sweet pudding made with milk or jaggery.',
    'payasam': 'Sweet pudding made with milk or jaggery.',
    'ada pradhaman': 'Kerala payasam of rice flakes (ada), jaggery and coconut milk.',
    'kadale bele': 'Chana dal (split Bengal gram).',
    'hesaru bele': 'Moong dal.',
    'gasagase': 'Poppy seeds.',
    'sabakki': 'Sago (sabudana).',
    'jangiri': 'Flower-shaped sweet of urad dal soaked in sugar syrup (Imarti).',
    'basundi': 'Thickened, sweetened milk.',
    'shrikhand': 'Sweet strained yogurt.',
    'sheer kurma': 'Vermicelli milk pudding with dates and nuts.',
    'kobbari mithai': 'Coconut burfi.',
    'beeda': 'Betel leaf with sweet fillings, served after meals.',
    'majjige': 'Buttermilk.',
    'neer majjige': 'Thin, spiced buttermilk.',
    'panaka': 'Jaggery drink with dry ginger and cardamom.',
    'punarpuli': 'Kokum fruit; its juice is a cooling coastal drink.',
    'kokum': 'Sour coastal fruit; its juice is a cooling drink.',
    'sol kadi': 'Pink drink made of kokum and coconut milk.',
    'falooda': 'Rose milk drink with vermicelli, basil seeds and ice cream.',

    // Event: tents, decoration and rituals
    'shamiana': 'Large decorative canopy or tent for functions.',
    'shamiyana': 'Large decorative canopy or tent for functions.',
    'pandal': 'Temporary covered structure put up for functions.',
    'chappara': 'Canopy or pandal put up for a function.',
    'german tent': 'Large aluminium-frame tent with a waterproof covering.',
    'hangar tent': 'Large aluminium-frame tent with a waterproof covering.',
    'mandap': 'Decorated canopy or stage where the wedding rituals take place.',
    'mallige': 'Jasmine flowers (e.g. Udupi Mallige).',
    'chendu hoovu': 'Marigold flowers.',
    'kalash': 'Decorated pot with coconut and mango leaves, used in rituals.',
    'kalasha': 'Decorated pot with coconut and mango leaves, used in rituals.',
    'toran': 'Decorative door hanging of flowers or mango leaves.',
    'thorana': 'Decorative door hanging of flowers or mango leaves.',
    'backdrop': 'Decorated wall or panel behind the stage.',
    'table skirting': 'Pleated cloth around the edges of a table.',
    'tiffany chair': 'Elegant banquet chair often used at weddings.',
    'maharaja chair': 'Large, ornate chair for the couple or chief guest.',
    'teapoy': 'Small low table.',
    'thamboola': 'Betel leaves, areca nut, fruit and gifts given to guests.',
    'tambula': 'Betel leaves, areca nut, fruit and gifts given to guests.',
    'purohit': 'Priest who conducts the rituals.',
    'seemantha': 'Baby shower ceremony.',
    'upanayana': 'Sacred thread ceremony.',
    'gruhapravesha': 'Housewarming ceremony.',
    'muhurtha': 'Auspicious time for the ceremony.',
    'nischitartha': 'Engagement ceremony.',
    'mehendi': 'Henna ceremony before the wedding.',
    'haldi': 'Turmeric ceremony before the wedding.',
    'sangeet': 'Music and dance evening before the wedding.',

    // Event: lighting, stage and entertainment
    'nilavilakku': 'Tall brass oil lamp lit at functions.',
    'kuthu deepa': 'Traditional brass standing oil lamp.',
    'deepa': 'Oil lamp.',
    'diya': 'Small oil lamp.',
    'sharpy lights': 'Moving-head beam lights for stage effects.',
    'par lights': 'Colour wash lights for the stage and walls.',
    'moving head lights': 'Motorised lights that move and change colour.',
    'uplighting': 'Lights placed on the floor to colour walls and pillars.',
    'truss': 'Metal frame for hanging lights, backdrops and screens.',
    'cold pyro': 'Safe cold-spark fountain effect, used for entries.',
    'sparkular': 'Safe cold-spark fountain effect, used for entries.',
    'led wall': 'Large video screen made of LED panels.',
    'chende': 'Traditional drum of coastal Karnataka and Kerala.',
    'chenda': 'Traditional drum of coastal Karnataka and Kerala.',
    'nadaswara': 'Traditional wind instrument played at weddings.',
    'nadaswaram': 'Traditional wind instrument played at weddings.',
    'nagaswara': 'Traditional wind instrument played at weddings.',
    'yakshagana': 'Traditional dance-drama of coastal Karnataka.',
    'huli vesha': 'Tiger dance performed in coastal Karnataka during festivals.',
    'pili vesha': 'Tiger dance (Tulu: Pili) performed during festivals.',
    'dollu kunitha': 'Drum dance of Karnataka.',
    'emcee': 'Host who presents the event.',
    'anchor': 'Host who presents the event.',
    'mist fan': 'Fan that sprays a fine water mist to cool guests.',
    'valet parking': 'Staff who park and fetch guests’ cars.'
  };

  function titleCase(text) {
    return text.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }

  /**
   * Returns a list of { term, text } meanings for an item name, or [] if
   * nothing in it needs explaining. A whole-name meaning wins; otherwise the
   * longest known phrases inside the name are explained one by one.
   */
  function meaning(rawName) {
    const name = String(rawName || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name) return [];
    if (MEANINGS[name]) return [{ term: '', text: MEANINGS[name] }];
    const parts = name.split(' ');
    const found = [];
    for (let i = 0; i < parts.length; ) {
      let matched = 0;
      for (let len = Math.min(3, parts.length - i); len >= 1; len -= 1) {
        const phrase = parts.slice(i, i + len).join(' ');
        const singular = phrase.replace(/s$/, '');
        const key = MEANINGS[phrase] ? phrase : MEANINGS[singular] ? singular : '';
        if (key) {
          if (!found.some((f) => f.text === MEANINGS[key])) found.push({ term: titleCase(phrase), text: MEANINGS[key] });
          matched = len;
          break;
        }
      }
      i += matched || 1;
    }
    return found;
  }

  window.SagarikaSpell = { check, meaning, names: ALL_NAMES };
})();
