import { Product } from '@/types/product';

// Comprehensive medical equipment based on the user's detailed list
export const medicalEquipment = {
    // DOCTOR'S OFFICE / GENERAL PRACTITIONER (50-75 items)
    examination: [
        'Stethoscope', 'Otoscope', 'Ophthalmoscope', 'Sphygmomanometer BP Monitor',
        'Digital Thermometer', 'Infrared Thermometer', 'Pulse Oximeter', 'Reflex Hammer',
        'Tuning Fork', 'Tongue Depressors', 'Examination Gloves Latex', 'Examination Gloves Nitrile',
        'Penlight', 'Magnifying Glass', 'Medical Scale', 'Height Measurement Rod'
    ],
    minorSurgical: [
        'Disposable Scalpel #10', 'Disposable Scalpel #11', 'Disposable Scalpel #15',
        'Needle Holder Small', 'Surgical Scissors Straight', 'Surgical Scissors Curved',
        'Tissue Forceps Toothed', 'Tissue Forceps Non-Toothed', 'Hemostatic Forceps Mosquito',
        'Suture 2-0', 'Suture 3-0', 'Suture 4-0', 'Needle Syringe Set 5ml', 'Needle Syringe Set 10ml',
        'Biopsy Punch 3mm', 'Biopsy Punch 4mm', 'Skin Stapler', 'Staple Remover', 'Surgical Marker Pen'
    ],
    woundCare: [
        'Gauze Pads 4x4', 'Gauze Rolls', 'Adhesive Bandages', 'Sterile Drapes Small',
        'Cotton Balls', 'Cotton Swabs', 'Betadine Solution', 'Alcohol Prep Pads',
        'Sterile Gloves Size 7', 'Sterile Gloves Size 8', 'Band-Aids Assorted', 'Medical Tape',
        'Wound Closure Strips', 'Hydrogen Peroxide', 'Antiseptic Spray'
    ],

    // SMALL CLINIC / OUTPATIENT (300-500 items)
    cuttingInstruments: [
        'Scalpel Handle #3', 'Scalpel Handle #4', 'Scalpel Handle #7',
        'Scalpel Blade #10', 'Scalpel Blade #11', 'Scalpel Blade #12', 'Scalpel Blade #15',
        'Scalpel Blade #20', 'Scalpel Blade #21', 'Scalpel Blade #22', 'Scalpel Blade #23',
        'Mayo Scissors Straight 6 inch', 'Mayo Scissors Curved 6 inch', 'Mayo Scissors Straight 7 inch',
        'Metzenbaum Scissors 6 inch', 'Metzenbaum Scissors 7 inch', 'Iris Scissors Straight',
        'Iris Scissors Curved', 'Suture Scissors', 'Bandage Scissors', 'Surgical Knife',
        'Amputation Knife', 'Bone Cutting Forceps', 'Wire Cutters', 'Rib Shears'
    ],
    graspingInstruments: [
        'Tissue Forceps Toothed 6 inch', 'Tissue Forceps Non-toothed 6 inch',
        'Adson Forceps Toothed', 'Adson Forceps Non-toothed', 'Russian Forceps',
        'Allis Tissue Forceps 6 inch', 'Babcock Forceps', 'Kocher Forceps',
        'Sponge Holding Forceps', 'Towel Clamps Backhaus', 'Bone Holding Forceps',
        'Tenaculum Forceps', 'Dressing Forceps', 'Splinter Forceps'
    ],
    clampingInstruments: [
        'Kelly Hemostatic Forceps Straight', 'Kelly Hemostatic Forceps Curved',
        'Crile Hemostatic Forceps', 'Halsted Mosquito Forceps',
        'Rochester-Pean Forceps', 'Ochsner Forceps', 'Mixter Forceps',
        'Bulldog Clamps Small', 'Bulldog Clamps Medium', 'Vessel Clips Applicator'
    ],
    retractors: [
        'Army-Navy Retractor', 'Richardson Retractor Small', 'Richardson Retractor Medium',
        'Deaver Retractor', 'Ribbon Retractor Malleable', 'Rake Retractor Blunt 4 Prong',
        'Rake Retractor Sharp 4 Prong', 'Skin Hook Single', 'Skin Hook Double',
        'Volkmann Retractor 4 Prong', 'Weitlaner Self-Retaining Retractor',
        'Gelpi Self-Retaining Retractor'
    ],
    suturingInstruments: [
        'Needle Holder Mayo-Hegar 6 inch', 'Needle Holder Mayo-Hegar 7 inch',
        'Needle Holder Olsen-Hegar', 'Suture Silk 2-0', 'Suture Silk 3-0', 'Suture Silk 4-0',
        'Suture Vicryl 2-0', 'Suture Vicryl 3-0', 'Suture Nylon 2-0', 'Suture Nylon 3-0',
        'Cutting Needle 1/2 Circle', 'Taper Needle 1/2 Circle', 'Skin Stapler 35W',
        'Staple Remover'
    ],

    // ORTHOPEDIC
    orthopedic: [
        'Bone Saw Hand', 'Bone Saw Power', 'Bone Drill Electric', 'Drill Bits 2mm',
        'Drill Bits 3mm', 'Drill Bits 4mm', 'Osteotome 10mm', 'Osteotome 15mm',
        'Bone Chisel Straight', 'Bone Chisel Curved', 'Bone File', 'Bone Rasp',
        'Bone Curette Small', 'Bone Curette Large', 'Rongeur Bone Cutting',
        'Bone Mallet', 'Bone Hammer', 'Bone Reduction Forceps', 'Bone Lever',
        'Periosteal Elevator', 'Gigli Saw', 'Gigli Saw Handles', 'K-wire 1.5mm',
        'K-wire 2mm', 'Steinmann Pin', 'Bone Screw 3.5mm', 'Bone Plate 6 Hole',
        'Orthopedic Drill Guide'
    ],

    // ENT INSTRUMENTS
    ent: [
        'Nasal Speculum Thudichum', 'Ear Speculum Set', 'Laryngoscope Handle',
        'Laryngoscope Blade Miller 1', 'Laryngoscope Blade Miller 2', 'Laryngoscope Blade Mac 3',
        'Tonsil Snare', 'Adenoid Curette', 'Nasal Forceps Hartmann', 'Ear Forceps Hartmann',
        'Tongue Retractor', 'Throat Swabs', 'Tonsil Scissors', 'Nasal Scissors',
        'Ear Syringe', 'Frazier Suction Tip 8Fr', 'Frazier Suction Tip 10Fr'
    ],

    // OPHTHALMIC
    ophthalmic: [
        'Eye Speculum Barraquer', 'Eye Speculum Wire', 'Corneal Forceps',
        'Iris Forceps Straight', 'Iris Forceps Curved', 'Cataract Knife',
        'Lens Loop', 'Eye Scissors Straight', 'Eye Scissors Curved',
        'Chalazion Forceps', 'Chalazion Curette', 'Lacrimal Probe',
        'Lacrimal Dilator', 'Eye Spud', 'Muscle Hook'
    ],

    // DENTAL/ORAL SURGERY
    dental: [
        'Dental Forceps Upper Molar', 'Dental Forceps Lower Molar', 'Dental Forceps Anterior',
        'Elevator Straight', 'Elevator Curved', 'Mouth Gag', 'Cheek Retractor',
        'Bone Rongeur Dental', 'Periosteal Elevator Molt', 'Root Tip Pick',
        'Surgical Bur Round', 'Needle Holder Dental'
    ],

    // GYNECOLOGICAL
    gynecological: [
        'Vaginal Speculum Graves Small', 'Vaginal Speculum Graves Medium', 'Vaginal Speculum Pederson',
        'Uterine Sound', 'Hegar Dilator Set', 'Pratt Dilator Set', 'Uterine Curette Sharp',
        'Uterine Curette Blunt', 'Tenaculum Forceps Single Tooth', 'Sponge Forceps Foerster',
        'Placenta Forceps', 'Uterine Scissors', 'Biopsy Forceps Tischler', 'IUD Inserter'
    ],

    // DIAGNOSTIC EQUIPMENT
    diagnostic: [
        'ECG Machine 12 Lead', 'Portable Ultrasound', 'Doppler Fetal Monitor',
        'Glucometer', 'Nebulizer Adult', 'Nebulizer Pediatric', 'Spirometer',
        'Peak Flow Meter', 'AED Defibrillator', 'Patient Monitor Basic',
        'Pulse Oximeter Tabletop', 'BP Monitor Automatic'
    ],

    // ANESTHESIA & AIRWAY
    anesthesia: [
        'Oxygen Cylinder', 'Oxygen Regulator', 'Oxygen Mask Adult', 'Oxygen Mask Pediatric',
        'Nasal Cannula Adult', 'Nasal Cannula Pediatric', 'Bag Valve Mask Adult',
        'Bag Valve Mask Pediatric', 'Oral Airway Size 3', 'Oral Airway Size 4',
        'Nasal Airway 6mm', 'Nasal Airway 7mm', 'Laryngeal Mask Airway Size 3',
        'Laryngeal Mask Airway Size 4', 'Endotracheal Tube 7mm', 'Endotracheal Tube 8mm',
        'Magill Forceps Adult', 'Suction Catheter 12Fr', 'Yankauer Suction Tip',
        'Portable Suction Machine'
    ],

    // HOSPITAL / MAJOR SURGICAL (2000+ items)
    cardiovascular: [
        'Vascular Clamp DeBakey', 'Vascular Clamp Satinsky', 'Vessel Loop',
        'Vascular Scissors Potts', 'Vascular Forceps DeBakey', 'Fogarty Catheter 3Fr',
        'Fogarty Catheter 4Fr', 'Vascular Dilator', 'Tunneling Instrument',
        'Sternal Saw Electric', 'Rib Spreader Finochietto', 'IMA Retractor'
    ],

    neurosurgery: [
        'Craniotome Electric', 'Cranial Perforator', 'Kerrison Rongeur 2mm', 'Kerrison Rongeur 3mm',
        'Pituitary Rongeur', 'Micro Scissors Straight', 'Micro Scissors Curved',
        'Micro Forceps Bayonet', 'Micro Needle Holder', 'Brain Spatula',
        'Dural Elevator', 'Penfield Dissector Set', 'Suction Bipolar Forceps',
        'Skull Clamp Mayfield', 'Neuroendoscope'
    ],

    laparoscopic: [
        'Laparoscope 0 Degree', 'Laparoscope 30 Degree', 'Veress Needle',
        'Trocar 5mm', 'Trocar 10mm', 'Trocar 12mm', 'CO2 Insufflator',
        'Laparoscopic Grasper', 'Laparoscopic Scissors', 'Laparoscopic Needle Holder',
        'Laparoscopic Clip Applier', 'Specimen Bag', 'Suction Irrigation Device'
    ],

    urological: [
        'Cystoscope', 'Resectoscope', 'Ureteroscope Rigid', 'Ureteroscope Flexible',
        'Nephroscope', 'Stone Basket Dormia', 'Stone Grasper', 'Ureteral Stent 6Fr',
        'Guidewire Sensor', 'Access Sheath', 'Kidney Clamp', 'Prostate Retractor',
        'Bladder Retractor', 'Vasectomy Instruments', 'Circumcision Clamp'
    ],

    generalSurgery: [
        'Intestinal Clamp Allen', 'Stomach Clamp Doyen', 'Linear Stapler',
        'Circular Stapler', 'GIA Stapler', 'Bowel Grasper', 'Liver Retractor',
        'Pringle Clamp', 'Gallbladder Forceps', 'T-Tube Set', 'Gastric Band'
    ]
};

export function generateProductCatalog(): Product[] {
    const products: Product[] = [];
    let idCounter = 1;

    Object.entries(medicalEquipment).forEach(([categoryKey, items]) => {
        items.forEach(item => {
            const price = Math.floor(Math.random() * 45000) + 5000;
            const discount = [0, 10, 15, 20, 25, 30][Math.floor(Math.random() * 6)];

            products.push({
                id: `surg-${String(idCounter++).padStart(4, '0')}`,
                name: item,
                description: `Professional ${item} for medical use. High-quality instrument suitable for clinical and hospital settings. Meets international healthcare standards.`,
                shortDescription: item,
                category: 'surgical',
                subcategory: categoryKey as any,
                price,
                originalPrice: discount > 0 ? Math.floor(price / (1 - discount / 100)) : price,
                discount,
                images: [],
                thumbnail: '',
                inStock: Math.random() > 0.05,
                stockQuantity: Math.floor(Math.random() * 150) + 10,
                sku: `${categoryKey.toUpperCase().slice(0, 3)}-${String(idCounter).padStart(4, '0')}`,
                brand: ['MedPro', 'SurgiTech', 'HealthCare Plus', 'MediEquip', 'ProMed Instruments'][Math.floor(Math.random() * 5)],
                specifications: [
                    { label: 'Material', value: 'Surgical Grade Stainless Steel' },
                    { label: 'Sterilization', value: 'Autoclavable' },
                    { label: 'Certification', value: 'ISO 13485, CE Mark' },
                ],
                features: [
                    'High-quality construction',
                    'Ergonomic design',
                    'Autoclavable and reusable',
                    'Corrosion resistant',
                    'Precision engineered'
                ],
                warranty: '1 year manufacturer warranty',
                rating: 4 + Math.random(),
                reviewCount: Math.floor(Math.random() * 250),
                isFeatured: Math.random() > 0.92,
                isNew: Math.random() > 0.85,
                tags: [categoryKey, 'medical', 'surgical', 'professional'],
                createdAt: '2024-01-01',
                updatedAt: '2024-02-01',
            });
        });
    });

    return products;
}
