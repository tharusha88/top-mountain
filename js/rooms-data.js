/* Rooms shown in "The stays" photo wall — edit rooms and photos here, not in the HTML.
   - Each room's photos live in assets/img/rooms/<folder>/ as 01.jpg, 02.jpg … (large)
     and assets/img/rooms/<folder>/t/01.jpg … (thumbnails). The first photo is the cover.
   - featured: true rooms show first; the rest appear after "See more rooms".
   - category links a room to its type, price and specs below. Room categories were set
     from the photos: check them, and change any that are wrong. */
window.ROOMS_DATA = {
  categories: {
    cabana:   { name: 'Wooden Cabana', from: 'Rs 8,000',  size: '25 – 35 m²', guests: '2 – 4 adults, 1 child', view: 'Mountain' },
    mud:      { name: 'Mud House',     from: 'Rs 13,200', size: '40 m²',      guests: '4 adults, 1 child',     view: 'Nature' },
    villa:    { name: 'Villa',         from: 'Rs 16,500', size: '45 – 120 m²', guests: '2 – 6 adults',          view: 'Private balcony' },
    bungalow: { name: 'Whole Bungalow', from: 'Rs 31,200', size: '150 m²',    guests: '8 adults, 3 children' }
  },
  rooms: [
    { name: 'Room 101', category: 'cabana', folder: '101', photos: ['01', '02', '03', '04', '05', '06'], featured: true },
    { name: 'Room 110', category: 'mud', folder: '110', photos: ['01', '02', '03', '04', '05', '06', '07'], featured: true },
    { name: 'Room 121', category: 'villa', folder: '121', photos: ['01', '02', '03', '04'], featured: true },
    { name: 'Room 116', category: 'villa', folder: '116', photos: ['01', '02', '03', '04', '05'], featured: true },
    { name: 'Rose Bungalow', category: 'bungalow', folder: 'rose-bungalow', photos: ['01', '02', '03'], featured: true },
    { name: 'Room 102', category: 'cabana', folder: '102', photos: ['01', '02', '03'] },
    { name: 'Room 103', category: 'cabana', folder: '103', photos: ['01', '02'] },
    { name: 'Room 104', category: 'villa', folder: '104', photos: ['01', '02', '03', '04', '05'] },
    { name: 'Room 105', category: 'villa', folder: '105', photos: ['01', '02', '03'] },
    { name: 'Room 106', category: 'villa', folder: '106', photos: ['01', '02', '03', '04'] },
    { name: 'Room 108', category: 'villa', folder: '108', photos: ['01', '02', '03', '04', '05', '06'] },
    { name: 'Room 111', category: 'villa', folder: '111', photos: ['01', '02', '03', '04', '05', '06'] },
    { name: 'Room 112', category: 'villa', folder: '112', photos: ['01', '02', '03'] },
    { name: 'Room 114', category: 'villa', folder: '114', photos: ['01', '02', '03'] },
    { name: 'Room 115', category: 'villa', folder: '115', photos: ['01', '02'] },
    { name: 'Room 117', category: 'villa', folder: '117', photos: ['01', '02', '03'] },
    { name: 'Room 125', category: 'villa', folder: '125', photos: ['01', '02', '03'] },
    { name: 'Room 126', category: 'villa', folder: '126', photos: ['01', '02'] },
    { name: 'Room 127', category: 'villa', folder: '127', photos: ['01', '02'] },
    { name: 'Room 128', category: 'villa', folder: '128', photos: ['01', '02', '03'] }
  ]
};
