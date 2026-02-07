# 🏢 Khanhub Enterprises - Complete Office & Business Solutions

A professional Next.js e-commerce platform for office equipment, furniture, and business supplies. Built with TypeScript, Tailwind CSS, and modern animations.

## 📦 What's Included

- **224 Products** across 4 types (New, Imported, Local, Budget)
- **6 Categories**: Office Equipment, Furniture, Electronics, Stationery, Communication, Safety & Security
- **Professional Animations**: Fade-in, slide, scale, hover effects
- **Responsive Design**: Mobile-first, works on all devices
- **Pakistani Pricing**: Realistic prices based on Daraz/market research
- **Khanhub Branding**: Complete with Vehari location, WhatsApp, phone

---

## 🎨 Features

### Product Management
✅ 224 realistic products with Pakistani brands
✅ Categorized by type: New, Imported, Local, Budget
✅ Product ratings, reviews, stock status
✅ Dynamic pricing with discounts
✅ Product badges and labels

### UX/UI Animations
✅ Fade-in animations on scroll
✅ Hover effects on cards
✅ Smooth transitions
✅ Skeleton loading states
✅ Floating WhatsApp button
✅ Sticky navigation

### Branding
✅ Khanhub Enterprises identity
✅ Primary: Blue (#0ea5e9)
✅ Secondary: Purple (#a855f7)
✅ Professional gradients
✅ Trust badges

---

## 📁 Folder Structure

```
enterprise/
├── public/
├── src/
│   ├── app/
│   │   ├── products/
│   │   │   ├── new/
│   │   │   │   └── page.tsx       # New products listing
│   │   │   ├── imported/
│   │   │   │   └── page.tsx       # Imported products
│   │   │   ├── local/
│   │   │   │   └── page.tsx       # Local products
│   │   │   └── old/
│   │   │       └── page.tsx       # Budget deals
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Homepage
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── EnterpriseNavbar.tsx   # Navigation with dropdowns
│   │   │   └── EnterpriseFooter.tsx   # Footer with links
│   │   └── products/
│   │       ├── ProductCard.tsx        # Animated product card
│   │       └── ProductGrid.tsx        # Grid layout
│   │
│   ├── data/
│   │   ├── enterprise-products.ts     # 224 products
│   │   └── index.ts                   # Helper functions
│   │
│   ├── types/
│   │   └── product.ts                 # TypeScript definitions
│   │
│   └── styles/
│       └── globals.css                # Custom animations
│
├── package.json
├── tailwind.config.js                 # Custom theme
├── tsconfig.json
├── next.config.js
└── README.md
```

---

## 🚀 Installation

### 1. Install Dependencies
```bash
cd enterprise
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Access at: `http://localhost:3002`

### 3. Build for Production
```bash
npm run build
npm start
```

---

## 📦 Products Overview

### By Type (224 Total)

| Type | Count | Description |
|------|-------|-------------|
| New | 56 | Brand new products with warranty |
| Imported | 56 | International brands (HP, Canon, Epson) |
| Local | 56 | Made in Pakistan |
| Budget | 56 | Refurbished & used items |

### By Category

- **Office Equipment**: Printers, Scanners, Copiers, Shredders, Binders
- **Furniture**: Chairs, Desks, Tables, Cabinets, Storage
- **Electronics**: Monitors, UPS, Projectors, Accessories
- **Stationery**: Paper, Files, Markers, Calculators
- **Communication**: Phones, PABX, VoIP Systems
- **Safety & Security**: CCTV, Access Control, Fire Safety

### Price Ranges (PKR)
- New: 5,000 - 150,000
- Imported: 20,000 - 200,000
- Local: 3,000 - 80,000
- Budget: 2,000 - 40,000

---

## 🎨 Animations & UX

### Research-Based Design
Studied top e-commerce sites:
- **Pakistani**: Daraz, HomeShopping, iShopping
- **Global**: Amazon, Alibaba, Staples

### Implemented Animations
```css
- fade-in-up       /* Content appears from bottom */
- fade-in-down     /* Content appears from top */
- slide-in-left    /* Slides from left */
- scale-in         /* Scales up smoothly */
- hover effects    /* Interactive hover states */
- skeleton loading /* Loading placeholders */
```

### UX Enhancements
- Sticky navigation bar
- Quick view on hover
- Product badges (NEW, IMPORTED, etc.)
- Stock indicators
- Trust badges
- Floating WhatsApp button
- Smooth scrolling

---

## 🌐 Khanhub Branding

### Contact Details
- **Company**: Khanhub Enterprises
- **Tagline**: Complete Office & Business Solutions
- **Location**: Vehari, Punjab, Pakistan
- **Serving**: All Pakistan
- **Phone**: +92 300 6395220
- **Email**: enterprise@khanhub.com.pk
- **WhatsApp**: +92 300 6395220

### Colors
- **Primary**: Blue (#0ea5e9) - Professional, trustworthy
- **Secondary**: Purple (#a855f7) - Premium, modern
- **Accents**: Green, Orange for badges

---

## 🔧 Customization

### Adding Products
Edit `/src/data/enterprise-products.ts`:

```typescript
const newProduct = {
  id: 'ENT-XXXX',
  name: 'Your Product Name',
  description: '...',
  category: 'office-equipment', // or furniture, electronics, etc.
  productType: 'new', // new, imported, local, old
  price: 25000,
  originalPrice: 30000,
  // ... more fields
};
```

### Changing Colors
Edit `tailwind.config.js`:

```javascript
colors: {
  primary: {
    600: '#YOUR_COLOR',
  }
}
```

### Updating Branding
- **Navbar**: `/src/components/layout/EnterpriseNavbar.tsx`
- **Footer**: `/src/components/layout/EnterpriseFooter.tsx`
- **Homepage**: `/src/app/page.tsx`

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile Features
- Hamburger menu
- Touch-friendly buttons
- Optimized images
- Simplified navigation

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

Set subdomain: `enterprise.khanhub.com` → Project

### Custom Server
```bash
npm run build
npm start
```

Configure Nginx:
```nginx
server {
    listen 80;
    server_name enterprise.khanhub.com;
    location / {
        proxy_pass http://localhost:3002;
    }
}
```

---

## 🔐 Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=https://enterprise.khanhub.com
NEXT_PUBLIC_API_URL=your_api_url
```

---

## 🎯 Next Steps

### Phase 1: Core Features
- [ ] Product detail pages
- [ ] Shopping cart functionality
- [ ] Search & filters
- [ ] Pagination

### Phase 2: User Features
- [ ] Authentication
- [ ] User dashboard
- [ ] Wishlist
- [ ] Order tracking

### Phase 3: Payments
- [ ] JazzCash integration
- [ ] EasyPaisa integration
- [ ] COD system
- [ ] Bank transfer

### Phase 4: Admin
- [ ] Admin dashboard
- [ ] Product management
- [ ] Order fulfillment
- [ ] Inventory tracking

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -ti:3002 | xargs kill -9
```

### Module Not Found
```bash
rm -rf node_modules package-lock.json
npm install
```

### Images Not Loading
Check `next.config.js` has correct domains

---

## 📄 License

© 2024 Khanhub Enterprises. All rights reserved.

---

## 📞 Support

For issues or questions:
- **Email**: enterprise@khanhub.com.pk
- **Phone**: +92 300 6395220
- **WhatsApp**: https://wa.me/923006395220

---

## 🎉 Credits

- **Research**: Pakistani e-commerce sites (Daraz, HomeShopping)
- **Design**: Inspired by global leaders (Amazon, Alibaba)
- **Built with**: Next.js 14, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion principles

---

**Ready to launch! 🚀**