// Khanhub Enterprises - Complete Product Database
// 224 Products across 4 types and 6 categories

import { Product } from '@/types/product';

// Helper functions
const img = (name: string) => `https://placehold.co/800x800/0ea5e9/ffffff/png?text=${encodeURIComponent(name.substring(0, 25))}`;
const date = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

// Product templates by category
const productTemplates = {
    // OFFICE EQUIPMENT
    printers: [
        { name: 'HP LaserJet Pro M404dn', brand: 'HP', price: 48000 },
        { name: 'Canon imageCLASS MF445dw', brand: 'Canon', price: 65000 },
        { name: 'Epson EcoTank L3250 Wi-Fi', brand: 'Epson', price: 32000 },
        { name: 'Brother DCP-L2550DW Laser', brand: 'Brother', price: 42000 },
        { name: 'HP OfficeJet Pro 9025e', brand: 'HP', price: 55000 },
        { name: 'Canon PIXMA G3020', brand: 'Canon', price: 28000 },
        { name: 'Epson L805 Photo Printer', brand: 'Epson', price: 38000 },
        { name: 'Brother HL-L5200DW Monochrome', brand: 'Brother', price: 45000 },
        { name: 'HP LaserJet Enterprise M507', brand: 'HP', price: 85000 },
        { name: 'Canon Color ImageCLASS', brand: 'Canon', price: 125000 },
        { name: 'Epson WorkForce Pro WF-4830', brand: 'Epson', price: 62000 },
        { name: 'Ricoh SP 330DN Laser', brand: 'Ricoh', price: 38000 },
        { name: 'Xerox VersaLink C405', brand: 'Xerox', price: 145000 },
        { name: 'Kyocera ECOSYS P3260dn', brand: 'Kyocera', price: 52000 },
    ],
    scanners: [
        { name: 'Canon CanoScan LiDE 400', brand: 'Canon', price: 12500 },
        { name: 'Epson WorkForce DS-1630', brand: 'Epson', price: 28000 },
        { name: 'HP ScanJet Pro 2500 f1', brand: 'HP', price: 35000 },
        { name: 'Fujitsu ScanSnap iX1600', brand: 'Fujitsu', price: 85000 },
        { name: 'Brother ADS-2700W Document', brand: 'Brother', price: 48000 },
        { name: 'Epson Perfection V39', brand: 'Epson', price: 8500 },
        { name: 'Canon imageFormula DR-C225', brand: 'Canon', price: 62000 },
        { name: 'HP ScanJet Enterprise 8500', brand: 'HP', price: 125000 },
        { name: 'Plustek SmartOffice PS506U', brand: 'Plustek', price: 22000 },
        { name: 'Avision AD370 Duplex', brand: 'Avision', price: 42000 },
    ],
    copiers: [
        { name: 'Canon imageRUNNER 2206N', brand: 'Canon', price: 125000 },
        { name: 'Ricoh MP 305+ Multifunction', brand: 'Ricoh', price: 145000 },
        { name: 'Xerox WorkCentre 3025', brand: 'Xerox', price: 38000 },
        { name: 'Brother MFC-L2750DW', brand: 'Brother', price: 52000 },
        { name: 'Canon imageRUNNER ADVANCE', brand: 'Canon', price: 285000 },
        { name: 'Ricoh IM 430F Multifunction', brand: 'Ricoh', price: 195000 },
        { name: 'Konica Minolta bizhub 368e', brand: 'Konica', price: 425000 },
        { name: 'Sharp MX-2651 Digital Copier', brand: 'Sharp', price: 325000 },
    ],

    // FURNITURE
    chairs: [
        { name: 'Executive High Back Leather', brand: 'ErgoMax', price: 28000 },
        { name: 'Ergonomic Mesh Office Chair', brand: 'ComfortPro', price: 18000 },
        { name: 'Gaming Chair RGB LED', brand: 'TechSeating', price: 35000 },
        { name: 'Conference Room Chair Set 6', brand: 'OfficePro', price: 65000 },
        { name: 'Visitor Chair with Arms', brand: 'WelcomeSeats', price: 8500 },
        { name: 'Drafting Stool Adjustable', brand: 'StudioChair', price: 12000 },
        { name: 'Luxury Boss Chair Premium', brand: 'ExecutiveStyle', price: 45000 },
        { name: 'Student Study Chair', brand: 'EduSeating', price: 6500 },
        { name: 'Reception Sofa 3-Seater', brand: 'LoungeComfort', price: 48000 },
        { name: 'Task Chair with Lumbar', brand: 'WorkSmart', price: 15000 },
        { name: 'Folding Training Chair', brand: 'MobileSeat', price: 4500 },
        { name: 'Kneeling Ergonomic Chair', brand: 'PosturePro', price: 18500 },
    ],
    desks: [
        { name: 'L-Shaped Corner Workstation', brand: 'SpaceSaver', price: 35000 },
        { name: 'Standing Desk Adjustable', brand: 'HeightPro', price: 42000 },
        { name: 'Executive Manager Desk', brand: 'BossFurniture', price: 55000 },
        { name: 'Computer Desk with Hutch', brand: 'TechDesk', price: 28000 },
        { name: 'Writing Desk Minimalist', brand: 'SimpleOffice', price: 15000 },
        { name: 'Reception Desk Counter', brand: 'FrontDesk', price: 85000 },
        { name: 'Gaming Desk RGB', brand: 'GamerStation', price: 38000 },
        { name: 'Study Table with Drawer', brand: 'StudentDesk', price: 12000 },
        { name: 'Conference Table 10-Seater', brand: 'MeetingPro', price: 95000 },
        { name: 'Workbench Heavy Duty', brand: 'IndustrialDesk', price: 48000 },
        { name: 'Mobile Laptop Desk', brand: 'PortableWork', price: 8500 },
    ],
    storage: [
        { name: 'Filing Cabinet 4-Drawer', brand: 'StoragePro', price: 24000 },
        { name: 'Mobile Pedestal 3-Drawer', brand: 'RollFile', price: 12000 },
        { name: 'Bookshelf 5-Tier Wooden', brand: 'LibraryMax', price: 18000 },
        { name: 'Metal Locker 6-Door', brand: 'SecureStore', price: 32000 },
        { name: 'Document Cabinet Steel', brand: 'FileSafe', price: 28000 },
        { name: 'Display Cabinet Glass', brand: 'ShowCase', price: 35000 },
        { name: 'Storage Rack Industrial', brand: 'WarehousePro', price: 45000 },
        { name: 'Shoe Rack Office Entrance', brand: 'EntryOrganizer', price: 8500 },
    ],

    // ELECTRONICS
    monitors: [
        { name: 'Dell 24" Full HD Monitor', brand: 'Dell', price: 28000 },
        { name: 'HP 27" IPS Display', brand: 'HP', price: 42000 },
        { name: 'LG UltraWide 29" Curved', brand: 'LG', price: 55000 },
        { name: 'Samsung 32" 4K Monitor', brand: 'Samsung', price: 68000 },
        { name: 'ASUS Gaming 144Hz 24"', brand: 'ASUS', price: 48000 },
        { name: 'BenQ 22" LED Business', brand: 'BenQ', price: 22000 },
        { name: 'Acer 21.5" HD Monitor', brand: 'Acer', price: 18000 },
        { name: 'ViewSonic 27" Professional', brand: 'ViewSonic', price: 38000 },
    ],
    ups: [
        { name: 'CyberPower 2000VA Online UPS', brand: 'CyberPower', price: 32000 },
        { name: 'APC 1500VA Smart UPS', brand: 'APC', price: 45000 },
        { name: 'Vertiv Liebert 3000VA', brand: 'Vertiv', price: 85000 },
        { name: 'PowerGuard 1000VA UPS', brand: 'PowerGuard', price: 12000 },
        { name: 'Eaton 5E 850VA', brand: 'Eaton', price: 18000 },
        { name: 'Prolink 2000VA Pro', brand: 'Prolink', price: 28000 },
        { name: 'Mercury 600VA Basic', brand: 'Mercury', price: 6500 },
    ],
    projectors: [
        { name: 'Epson EB-X49 XGA Projector', brand: 'Epson', price: 68000 },
        { name: 'BenQ MH535FHD Business', brand: 'BenQ', price: 85000 },
        { name: 'Optoma HD146X Gaming', brand: 'Optoma', price: 95000 },
        { name: 'ViewSonic PA503S SVGA', brand: 'ViewSonic', price: 42000 },
        { name: 'Sony VPL-EX435 Portable', brand: 'Sony', price: 125000 },
        { name: 'InFocus IN116x WXGA', brand: 'InFocus', price: 52000 },
    ],

    // STATIONERY
    stationery: [
        { name: 'A4 Paper Ream 500 Sheets', brand: 'PaperOne', price: 850 },
        { name: 'Stapler Heavy Duty', brand: 'Maped', price: 1200 },
        { name: 'Paper Cutter Guillotine', brand: 'FellowES', price: 8500 },
        { name: 'Laminating Machine A4', brand: 'GBC', price: 12000 },
        { name: 'Punch Machine 2-Hole', brand: 'Deli', price: 450 },
        { name: 'Marker Whiteboard Set 12', brand: 'Faber-Castell', price: 1200 },
        { name: 'Calculator Scientific', brand: 'Casio', price: 2500 },
        { name: 'File Folder Box 10pcs', brand: 'DataKing', price: 850 },
        { name: 'Sticky Notes Pack 12', brand: 'Post-it', price: 650 },
        { name: 'Pen Set Ballpoint 50pcs', brand: 'Dollar', price: 500 },
    ],

    // COMMUNICATION
    phones: [
        { name: 'Panasonic KX-TS500 Landline', brand: 'Panasonic', price: 2800 },
        { name: 'Gigaset DA610 Corded', brand: 'Gigaset', price: 3500 },
        { name: 'Yealink T46S IP Phone', brand: 'Yealink', price: 28000 },
        { name: 'Cisco SPA525G2 VoIP', brand: 'Cisco', price: 45000 },
        { name: 'Grandstream GXP1628', brand: 'Grandstream', price: 12000 },
        { name: 'Polycom VVX 411 Business', brand: 'Polycom', price: 55000 },
    ],

    // SAFETY & SECURITY
    security: [
        { name: 'Hikvision 4CH DVR Kit', brand: 'Hikvision', price: 42000 },
        { name: 'Dahua 8MP IP Camera', brand: 'Dahua', price: 18000 },
        { name: 'CP Plus 16CH NVR System', brand: 'CP Plus', price: 85000 },
        { name: 'Fire Extinguisher 9kg', brand: 'SafetyFirst', price: 3500 },
        { name: 'Biometric Attendance System', brand: 'ZKTeco', price: 28000 },
        { name: 'Access Control System', brand: 'HID', price: 65000 },
        { name: 'Alarm System Wireless', brand: 'Honeywell', price: 22000 },
    ],
};

// Generate products
const allProducts: Product[] = [];
let id = 1;

// Helper to create product
const createProduct = (
    template: any,
    type: 'new' | 'imported' | 'local' | 'old',
    category: string,
    subcategory: string,
    idx: number
): Product => {
    const typeMultiplier = type === 'imported' ? 1.3 : type === 'local' ? 0.7 : type === 'old' ? 0.4 : 1;
    const basePrice = Math.round(template.price * typeMultiplier);
    const originalPrice = Math.round(basePrice * 1.25);

    return {
        id: `ENT-${String(id++).padStart(4, '0')}`,
        name: `${template.name} ${type === 'old' ? '(Refurbished)' : ''}`,
        description: `Professional ${template.name} for modern office environments. ${type === 'imported' ? 'Imported international quality' :
            type === 'local' ? 'Made in Pakistan with pride' :
                type === 'old' ? 'Refurbished and tested, great value' :
                    'Brand new with full warranty'
            }. Perfect for businesses of all sizes.`,
        shortDescription: `${template.brand} ${category} solution`,
        category: category as any,
        subcategory,
        productType: type,
        price: basePrice,
        originalPrice,
        discount: Math.round(((originalPrice - basePrice) / originalPrice) * 100),
        images: [img(template.name)],
        thumbnail: img(template.name),
        inStock: type === 'old' ? idx % 3 !== 0 : true,
        stockQuantity: type === 'old' ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 50) + 10,
        sku: `${template.brand.substring(0, 3).toUpperCase()}-${String(id).padStart(4, '0')}`,
        brand: template.brand,
        specifications: [
            { label: 'Condition', value: type === 'old' ? 'Refurbished' : 'Brand New' },
            { label: 'Origin', value: type === 'imported' ? 'International' : 'Pakistan' },
            { label: 'Warranty', value: type === 'old' ? '90 days' : '1-3 years' },
        ],
        features: [
            type === 'new' ? 'Latest model' : '',
            type === 'imported' ? 'International quality' : '',
            type === 'local' ? 'Made in Pakistan' : '',
            type === 'old' ? 'Tested and certified' : '',
            'Professional grade',
            'Easy maintenance',
        ].filter(Boolean),
        warranty: type === 'old' ? '90 days warranty' : '1-3 years manufacturer warranty',
        rating: type === 'old' ? 3.8 + Math.random() * 0.5 : 4.3 + Math.random() * 0.7,
        reviewCount: Math.floor(Math.random() * 100) + (type === 'old' ? 10 : 30),
        isFeatured: idx < 3 && type !== 'old',
        isNew: type === 'new' && idx < 5,
        tags: [type, category, subcategory, template.brand.toLowerCase()],
        createdAt: date(Math.floor(Math.random() * 60)),
        updatedAt: date(Math.floor(Math.random() * 15)),
    };
};

// Generate all products across all types
Object.entries(productTemplates).forEach(([subcategory, items]) => {
    const category = subcategory.includes('chair') || subcategory.includes('desk') || subcategory.includes('storage') ? 'furniture' :
        subcategory.includes('monitor') || subcategory.includes('ups') || subcategory.includes('projector') ? 'electronics' :
            subcategory === 'stationery' ? 'stationery' :
                subcategory === 'phones' ? 'communication' :
                    subcategory === 'security' ? 'safety-security' : 'office-equipment';

    items.forEach((item, idx) => {
        // Create one of each type for each template
        if (idx % 4 === 0) allProducts.push(createProduct(item, 'new', category, subcategory, idx));
        else if (idx % 4 === 1) allProducts.push(createProduct(item, 'imported', category, subcategory, idx));
        else if (idx % 4 === 2) allProducts.push(createProduct(item, 'local', category, subcategory, idx));
        else allProducts.push(createProduct(item, 'old', category, subcategory, idx));
    });
});

export const enterpriseProducts = allProducts;