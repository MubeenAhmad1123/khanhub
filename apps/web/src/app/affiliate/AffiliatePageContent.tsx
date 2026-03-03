'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Users,
    ClipboardCheck,
    Coins,
    Stethoscope,
    GraduationCap,
    Briefcase,
    HeartPulse,
    BookOpen,
    Heart,
    ChevronDown,
    ChevronUp,
    MessageCircle,
    Mail,
    ArrowRight,
    TrendingUp
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { SITE } from '@/data/site';
import InquiryForm from '@/components/forms/InquiryForm';

// --- Types ---
type Language = 'en' | 'ur';

const CONTENT = {
    en: {
        hero: {
            badge: "Partner With Us",
            title: "Turn Your Network Into Impact — And Earn While You Help",
            subtitle: "KhanHub's Affiliate Program rewards you every time you connect someone in need with our services. Help your community and grow your income.",
            cta: "Join the Program",
            franchiseCta: "Franchise Opportunities"
        },
        franchisePromo: {
            title: "Ready to Level Up?",
            subtitle: "Become a KhanHub Franchise owner and lead your own department with our proven success model.",
            cta: "Explore Franchises"
        },
        whatIsIt: {
            title: "What is the Affiliate Program?",
            p1: "KhanHub runs 6 active departments serving the community of Vehari and beyond. We believe in the power of referral and community building.",
            p2: "If you know someone who needs our medical, educational, or professional services, you can refer them to us through your unique affiliate identity.",
            p3: "When that person registers and receives our service, we pay you a small commission as a thank-you — except for Welfare, which is purely charitable work."
        },
        howItWorks: {
            title: "Simple 3-Step Journey",
            steps: [
                {
                    title: "You Refer",
                    text: "You know someone who needs KhanHub's help — a patient, a student, a job seeker. You bring them to us or share their contact with us.",
                    icon: Users
                },
                {
                    title: "They Register",
                    text: "The person you referred comes to KhanHub, registers at the relevant department, and starts receiving our services.",
                    icon: ClipboardCheck
                },
                {
                    title: "You Earn",
                    text: "Once confirmed, we calculate your commission based on the agreed percentage for that department and transfer it to you.",
                    icon: Coins
                }
            ]
        },
        departments: {
            title: "Our Departments & Your Earnings",
            subtitle: "Every department has a fixed affiliate commission — agreed upfront.",
            cards: [
                {
                    name: "KhanHub Hospital",
                    image: "/images/medical-center.webp",
                    commission: "2% per registered patient",
                    desc: "Refer patients needing medical, surgical, or emergency care to KhanHub Hospital and earn a commission on their registration fee.",
                    color: "blue"
                },
                {
                    name: "School Center",
                    image: "/images/education.webp",
                    commission: "3% per enrolled student",
                    desc: "Know a family looking for quality education? Refer students to our school center and earn when they enroll.",
                    color: "yellow"
                },
                {
                    name: "Job Center",
                    image: "/images/job.webp",
                    commission: "2% per placed candidate",
                    desc: "Help someone find employment through KhanHub Job Center and earn a commission when they are successfully placed.",
                    color: "orange"
                },
                {
                    name: "Rehab Center",
                    image: "/images/rehab.webp",
                    commission: "3% per admitted patient",
                    desc: "If you know someone struggling with addiction or in need of rehabilitation, refer them to us. You earn when they are admitted and treated.",
                    color: "red"
                },
                {
                    name: "Institute of Health Sciences",
                    image: "/images/institute-health-sciences.webp",
                    commission: "2% per admitted student",
                    desc: "Refer students interested in paramedical courses — nursing, pharmacy, lab technology, and more — and earn on their admission.",
                    color: "teal"
                },
                {
                    name: "Welfare Organization",
                    image: "/images/welfare-organization.webp",
                    commission: "No Commission — Pure Charity 🤍",
                    desc: "Referring orphans, disabled individuals, or those in need to our Welfare program is a noble act of charity.",
                    color: "gray",
                    special: "Welfare referrals are acts of sadaqah. No payment. Pure reward."
                }
            ]
        },
        story: {
            title: "A Story That Shows How It Works",
            items: [
                "Ahmad lives in a village near Vehari. His neighbor's son has been struggling with drug addiction for years.",
                "Ahmad tells the family about KhanHub Rehab Center. He contacts KhanHub, shares the patient's details, and helps arrange the visit.",
                "The patient is admitted to the Rehab Center. KhanHub registers Ahmad as the referring affiliate.",
                "Once the patient's admission fee is confirmed, KhanHub calculates 3% and transfers Ahmad's commission within the agreed timeframe."
            ],
            closing: "Ahmad didn't just earn money. He saved a life."
        },
        terms: {
            title: "Affiliate Program Terms",
            points: [
                "Commission is calculated on the base registration or admission fee only.",
                "Payments are processed within 7–14 business days after service confirmation.",
                "The referrer must be registered as an affiliate with KhanHub before referring.",
                "Commission rates may be updated; affiliates will be notified in advance.",
                "KhanHub reserves the right to verify all referrals.",
                "Welfare referrals do not qualify for any commission under any circumstance.",
                "Fraudulent referrals will result in immediate disqualification."
            ]
        },
        form: {
            title: "Ready to Join? Apply Now",
            subtitle: "Fill in your details and our team will contact you within 24 hours.",
            altTitle: "Or Contact Directly",
            whatsapp: "Chat on WhatsApp",
            email: "Send an Email"
        }
    },
    ur: {
        hero: {
            badge: "ہمارے ساتھ شراکت دار بنیں",
            title: "اپنے نیٹ ورک کو اثر میں بدلیں — اور مدد کرتے ہوئے کمائیں",
            subtitle: "خان ہب کا ایفی لیٹ پروگرام آپ کو ہر اس وقت انعام دیتا ہے جب آپ کسی ضرورت مند کو ہماری خدمات سے جوڑتے ہیں۔ اپنے معاشرے کی مدد کریں اور اپنی آمدنی بڑھائیں۔",
            cta: "پروگرام میں شامل ہوں",
            franchiseCta: "فرنچائز کے مواقع"
        },
        franchisePromo: {
            title: "کیا آپ مزید آگے بڑھنا چاہتے ہیں؟",
            subtitle: "خان ہب فرنچائز کے مالک بنیں اور ہمارے ثابت شدہ کامیابی کے ماڈل کے ساتھ اپنے شعبے کی قیادت کریں۔",
            cta: "فرنچائزز دریافت کریں"
        },
        whatIsIt: {
            title: "ایفی لیٹ پروگرام کیا ہے؟",
            p1: "خان ہب وہاڑی اور اس سے آگے کے معاشرے کی خدمت کرنے والے 6 فعال شعبے چلاتا ہے۔ ہم ریفرل اور کمیونٹی کی تعمیر کی طاقت پر یقین رکھتے ہیں۔",
            p2: "اگر آپ کسی ایسے شخص کو جانتے ہیں جسے ہماری طبی، تعلیمی یا پیشہ ورانہ خدمات کی ضرورت ہے، تو آپ اپنی منفرد ایفی لیٹ شناخت کے ذریعے انہیں ہمارے پاس بھیج سکتے ہیں۔",
            p3: "جب وہ شخص رجسٹر ہوتا ہے اور ہماری خدمت حاصل کرتا ہے، تو ہم آپ کو شکریہ کے طور پر ایک چھوٹا کمیشن ادا کرتے ہیں — سوائے ویلفیئر کے، جو خالصتاً فلاحی کام ہے۔"
        },
        howItWorks: {
            title: "آسان 3 مرحلہ وار سفر",
            steps: [
                {
                    title: "آپ ریفر کریں",
                    text: "آپ کسی ایسے شخص کو جانتے ہیں جسے خان ہب کی مدد کی ضرورت ہے — ایک مریض، ایک طالب علم، یا نوکری کا متلاشی۔ آپ انہیں ہمارے پاس لاتے ہیں یا ان کا رابطہ ہمارے ساتھ شیئر کرتے ہیں۔",
                    icon: Users
                },
                {
                    title: "وہ رجسٹر ہوتے ہیں",
                    text: "جس شخص کو آپ نے ریفر کیا وہ خان ہب آتا ہے، متعلقہ شعبے میں رجسٹر ہوتا ہے، اور ہماری خدمات حاصل کرنا شروع کرتا ہے۔",
                    icon: ClipboardCheck
                },
                {
                    title: "آپ کماتے ہیں",
                    text: "تصدیق کے بعد، ہم اس شعبے کے لیے طے شدہ فیصد کی بنیاد پر آپ کے کمیشن کا حساب لگاتے ہیں اور اسے آپ کو منتقل کر دیتے ہیں۔",
                    icon: Coins
                }
            ]
        },
        departments: {
            title: "ہمارے شعبے اور آپ کی آمدنی",
            subtitle: "ہر شعبے کا ایک فکسڈ ایفی لیٹ کمیشن ہے — جو پہلے سے طے شدہ ہے۔",
            cards: [
                {
                    name: "خان ہب ہسپتال",
                    image: "/images/medical-center.webp",
                    commission: "2% فی رجسٹرڈ مریض",
                    desc: "خان ہب ہسپتال میں طبی، جراحی، یا ہنگامی دیکھ بھال کی ضرورت والے مریضوں کو ریفر کریں اور ان کی رجسٹریشن فیس پر کمیشن کمائیں۔",
                    color: "blue"
                },
                {
                    name: "اسکول سینٹر",
                    image: "/images/education.webp",
                    commission: "3% فی داخل طالب علم",
                    desc: "معیاری تعلیم کی تلاش میں کسی خاندان کو جانتے ہیں؟ طلباء کو ہمارے اسکول سینٹر میں ریفر کریں اور ان کے داخلے پر کمائیں۔",
                    color: "yellow"
                },
                {
                    name: "جوب سینٹر",
                    image: "/images/job.webp",
                    commission: "2% فی منتخب امیدوار",
                    desc: "خان ہب جوب سینٹر کے ذریعے کسی کو ملازمت تلاش کرنے میں مدد کریں اور جب وہ کامیابی سے تعینات ہو جائیں تو کمیشن کمائیں۔",
                    color: "orange"
                },
                {
                    name: "ری ہیب سینٹر",
                    image: "/images/rehab.webp",
                    commission: "3% فی داخل مریض",
                    desc: "اگر آپ کسی ایسے شخص کو جانتے ہیں جو نشے کی لت میں مبتلا ہے یا اسے بحالی کی ضرورت ہے، تو اسے ہمارے پاس ریفر کریں۔ جب وہ داخل ہوں گے اور علاج کرائیں گے تو آپ کمائیں گے۔",
                    color: "red"
                },
                {
                    name: "انسٹی ٹیوٹ آف ہیلتھ سائنسز",
                    image: "/images/institute-health-sciences.webp",
                    commission: "2% فی داخل طالب علم",
                    desc: "پیرامیڈیکل کورسز — نرسنگ، فارمیسی، لیب ٹیکنالوجی، اور بہت کچھ — میں دلچسی رکھنے والے طلباء کو ریفر کریں اور ان کے داخلے پر کمائیں۔",
                    color: "teal"
                },
                {
                    name: "ویلفیئر آرگنائزیشن",
                    image: "/images/welfare-organization.webp",
                    commission: "کوئی کمیشن نہیں — خالص صدقہ 🤍",
                    desc: "یتیموں، معذور افراد، یا ضرورت مندوں کو ہمارے ویلفیئر پروگرام میں ریفر کرنا صدقہ جاریہ اور نیکی کا کام ہے۔",
                    color: "gray",
                    special: "ویلفیئر ریفرلز صدقہ کے کام ہیں۔ کوئی ادائیگی نہیں۔ صرف ثواب۔"
                }
            ]
        },
        story: {
            title: "ایک کہانی جو دکھاتی ہے کہ یہ کیسے کام کرتا ہے",
            items: [
                "احمد وہاڑی کے قریب ایک گاؤں میں رہتا ہے۔ اس کے پڑوسی کا بیٹا برسوں سے منشیات کی لت سے لڑ رہا ہے۔",
                "احمد اس خاندان کو خان ہب ری ہیب سینٹر کے بارے میں بتاتا ہے۔ وہ خان ہب سے رابطہ کرتا ہے، مریض کی تفصیلات شیئر کرتا ہے، اور دورے کا انتظام کرنے میں مدد کرتا ہے۔",
                "مریض کو ری ہیب سینٹر میں داخل کر لیا جاتا ہے۔ خان ہب احمد کو ریفر کرنے والے ایفی لیٹ کے طور پر رجسٹر کرتا ہے۔",
                "مریض کے داخلے کی فیس کی تصدیق ہونے کے بعد، خان ہب 3 فیصد کا حساب لگاتا ہے اور احمد کا کمیشن طے شدہ وقت کے اندر منتقل کر دیتا ہے۔"
            ],
            closing: "احمد نے صرف پیسے نہیں کمائے۔ اس نے ایک زندگی بچائی۔"
        },
        terms: {
            title: "ایفی لیٹ پروگرام کی شرائط",
            points: [
                "کمیشن کا حساب صرف بنیادی رجسٹریشن یا داخلہ فیس پر لگایا جاتا ہے۔",
                "سروس کی تصدیق کے بعد 7 سے 14 کاروباری دنوں کے اندر ادائیگیاں کی جاتی ہیں۔",
                "ریفر کرنے والے کو ریفر کرنے سے پہلے خان ہب کے ساتھ ایفی لیٹ کے طور پر رجسٹر ہونا چاہیے۔",
                "کمیشن کی شرحوں کو اپ ڈیٹ کیا جا سکتا ہے؛ ایفی لیٹس کو پہلے سے مطلع کیا جائے گا۔",
                "خان ہب تمام ریفرلز کی تصدیق کا حق محفوظ رکھتا ہے۔",
                "ویلفیئر ریفرلز کسی بھی صورت میں کسی کمیشن کے اہل نہیں ہیں۔",
                "غیر قانونی یا جعلی ریفرلز کے نتیجے میں فوری نااہلی ہوگی۔"
            ]
        },
        form: {
            title: "شامل ہونے کے لیے تیار ہیں؟ ابھی اپلائی کریں",
            subtitle: "اپنی تفصیلات درج کریں اور ہماری ٹیم 24 گھنٹوں کے اندر آپ سے رابطہ کرے گی۔",
            altTitle: "یا براہ راست رابطہ کریں",
            whatsapp: "واٹس ایپ پر بات کریں",
            email: "ای میل بھیجیں"
        }
    }
};

// --- Helper Components ---

const FadeInSection: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => setIsVisible(entry.isIntersecting));
        }, { threshold: 0.1 });

        const current = domRef.current;
        if (current) observer.observe(current);
        return () => { if (current) observer.unobserve(current); };
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-neutral-200 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-4 sm:py-5 text-left transition-all hover:text-primary-600"
            >
                <span className="font-bold text-neutral-800 text-sm sm:text-base">{title}</span>
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}>
                <div className="text-neutral-600 text-sm leading-relaxed">{children}</div>
            </div>
        </div>
    );
};

// --- Main Page Component ---

export default function AffiliatePageContent() {
    const [lang, setLang] = useState<Language>('en');
    const t = CONTENT[lang];
    const isRtl = lang === 'ur';

    return (
        <main className={`overflow-x-hidden ${isRtl ? 'font-urdu' : 'font-sans'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            {/* ── Language Switcher ── */}
            <div className="fixed top-24 right-6 sm:top-28 sm:right-10 z-[60]">
                <button
                    onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-neutral-200 rounded-full shadow-lg hover:shadow-xl hover:border-primary-300 transition-all group"
                >
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-600 group-hover:scale-110 transition-transform">
                        {lang === 'en' ? 'اردو' : 'EN'}
                    </div>
                    <span className="text-xs font-bold text-neutral-800">
                        {lang === 'en' ? 'اردو میں دیکھیں' : 'View in English'}
                    </span>
                </button>
            </div>

            {/* ── Section 1: Hero ── */}
            <section className="relative min-h-[90vh] flex items-center pt-24 sm:pt-32 pb-16 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 z-0">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <FadeInSection>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-emerald-100 text-xs sm:text-sm font-bold uppercase tracking-widest mb-8">
                                <Users className="w-4 h-4" />
                                {t.hero.badge}
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black text-white leading-[1.1] mb-8">
                                {t.hero.title}
                            </h1>
                            <p className="text-lg sm:text-xl text-emerald-50/80 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                                {t.hero.subtitle}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="#register"
                                    className="w-full sm:w-auto px-8 py-5 bg-white text-emerald-900 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-black/20 hover:bg-emerald-50 hover:scale-105 active:scale-95 transition-all text-center"
                                >
                                    {t.hero.cta}
                                </Link>
                                <Link
                                    href="/franchise"
                                    className="w-full sm:w-auto px-8 py-5 bg-emerald-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-black/10 hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all text-center border border-emerald-500/30"
                                >
                                    {t.hero.franchiseCta}
                                </Link>
                                <div className="hidden sm:flex items-center gap-3">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-emerald-800 bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-emerald-100/60 uppercase tracking-widest">500+ Active Affiliates</span>
                                </div>
                            </div>
                        </FadeInSection>
                    </div>
                </div>

                {/* Floating Decorative Logo */}
                <div className="absolute -bottom-20 -right-20 w-80 h-80 opacity-10 blur-3xl bg-emerald-300 rounded-full animate-pulse" />
                <div className="absolute -top-20 -left-20 w-80 h-80 opacity-10 blur-3xl bg-green-400 rounded-full animate-pulse" />
            </section>

            {/* ── Section 2: What Is It? ── */}
            <section className="py-24 sm:py-32 bg-white">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <FadeInSection>
                            <div className="space-y-6">
                                <div className="w-16 h-1 bg-emerald-500 rounded-full mb-8" />
                                <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 leading-tight">
                                    {t.whatIsIt.title}
                                </h2>
                                <div className="space-y-4 text-neutral-600 leading-relaxed">
                                    <p className="text-base sm:text-lg">{t.whatIsIt.p1}</p>
                                    <p className="text-base sm:text-lg">{t.whatIsIt.p2}</p>
                                    <p className="text-base sm:text-lg font-bold text-emerald-600 px-4 py-3 bg-emerald-50 rounded-xl border-l-4 border-emerald-500">
                                        {t.whatIsIt.p3}
                                    </p>
                                </div>
                            </div>
                        </FadeInSection>
                        <FadeInSection delay={200}>
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-emerald-100/50 rounded-[2.5rem] blur-2xl group-hover:bg-emerald-200/50 transition-colors" />
                                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
                                    <Image
                                        src="/logo.webp"
                                        alt="KhanHub Impact"
                                        fill
                                        className="object-contain p-20 bg-emerald-50 group-hover:scale-105 transition-transform duration-700"
                                    />
                                </div>
                                {/* Stats Overlay on mobile/tablet */}
                                <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-xl border border-neutral-100 flex items-center gap-4 animate-bounce-slow">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Impact</p>
                                        <p className="text-xl font-black text-neutral-800">Growth-Driven</p>
                                    </div>
                                </div>
                            </div>
                        </FadeInSection>
                    </div>
                </div>
            </section>

            {/* ── Section 3: How It Works ── */}
            <section className="py-24 sm:py-32 bg-neutral-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-50/50 -skew-x-12 translate-x-1/2" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <FadeInSection>
                            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-6">
                                {t.howItWorks.title}
                            </h2>
                            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full" />
                        </FadeInSection>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 relative">
                        {/* Connector Line (Desktop Only) */}
                        <div className={`hidden md:block absolute top-12 ${isRtl ? 'right-20 left-20' : 'left-20 right-20'} h-0.5 bg-dashed border-t-2 border-dashed border-emerald-200`} />

                        {t.howItWorks.steps.map((step, idx) => (
                            <FadeInSection key={idx} delay={idx * 150}>
                                <div className="relative group bg-white p-8 rounded-[2rem] border border-neutral-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                    <div className={`w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white mb-8 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform ${isRtl ? 'mr-0' : 'ml-0'}`}>
                                        <step.icon className="w-8 h-8" />
                                    </div>
                                    <div className="absolute top-8 right-8 text-4xl font-black text-neutral-100 group-hover:text-emerald-50 transition-colors">0{idx + 1}</div>
                                    <h3 className="text-xl font-bold text-neutral-900 mb-4">{step.title}</h3>
                                    <p className="text-neutral-600 text-sm leading-relaxed">{step.text}</p>
                                </div>
                            </FadeInSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Section 4: Departments ── */}
            <section className="py-24 sm:py-32 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <FadeInSection>
                            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-4">
                                {t.departments.title}
                            </h2>
                            <p className="text-neutral-500 text-base sm:text-lg">{t.departments.subtitle}</p>
                        </FadeInSection>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {t.departments.cards.map((card, idx) => (
                            <FadeInSection key={idx} delay={idx * 100}>
                                <div className={`group flex flex-col h-full bg-white rounded-[2rem] border border-neutral-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 ${card.color === 'gray' ? 'bg-neutral-50/50 grayscale-[0.3]' : ''}`}>
                                    <div className="relative h-48 overflow-hidden">
                                        <Image
                                            src={card.image}
                                            alt={card.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-black/20`}
                                                style={{ backgroundColor: card.color === 'blue' ? '#3b82f6' : card.color === 'yellow' ? '#eab308' : card.color === 'orange' ? '#f97316' : card.color === 'red' ? '#ef4444' : card.color === 'teal' ? '#14b8a6' : '#6b7280' }}>
                                                {card.commission}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold text-neutral-900 mb-4 group-hover:text-emerald-600 transition-colors">{card.name}</h3>
                                        <p className="text-neutral-600 text-sm leading-relaxed mb-6 flex-1">
                                            {card.desc}
                                        </p>
                                        {card.special && (
                                            <p className="text-xs font-bold text-neutral-400 italic bg-neutral-100/50 p-3 rounded-xl border border-neutral-200/50">
                                                ✨ {card.special}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </FadeInSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Section 5: Real Story ── */}
            <section className="py-24 sm:py-32 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute inset-0 bg-emerald-50/30 z-0" />
                <div className="absolute top-0 left-0 w-64 h-64 bg-white/40 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <FadeInSection>
                            <div className="bg-white p-8 sm:p-16 rounded-[3rem] shadow-2xl border border-emerald-100 relative">
                                <div className="absolute -top-10 left-10 w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white text-5xl shadow-xl rotate-6">
                                    "
                                </div>

                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-neutral-900 mb-12 sm:mb-16 leading-tight">
                                    {t.story.title}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16">
                                    <div className="space-y-8">
                                        {t.story.items.slice(0, 2).map((text, i) => (
                                            <div key={i} className="flex gap-6 group">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all transform group-hover:rotate-12">
                                                    {i === 0 ? <Users className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                                                </div>
                                                <p className="text-neutral-700 text-base sm:text-lg leading-relaxed">{text}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-8">
                                        {t.story.items.slice(2).map((text, i) => (
                                            <div key={i} className="flex gap-6 group">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all transform group-hover:rotate-12">
                                                    {i === 0 ? <Stethoscope className="w-6 h-6" /> : <Coins className="w-6 h-6" />}
                                                </div>
                                                <p className="text-neutral-700 text-base sm:text-lg leading-relaxed">{text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-16 pt-10 border-t border-emerald-100 text-center">
                                    <p className="text-2xl sm:text-3xl font-display font-black text-emerald-600 italic">
                                        {t.story.closing}
                                    </p>
                                </div>
                            </div>
                        </FadeInSection>
                    </div>
                </div>
            </section>

            {/* ── Section 6: Terms (Accordion) ── */}
            <section className="py-24 sm:py-32 bg-white">
                <div className="container mx-auto px-6 max-w-4xl">
                    <FadeInSection>
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-4">{t.terms.title}</h2>
                            <div className="w-16 h-1 bg-neutral-200 mx-auto rounded-full" />
                        </div>

                        <div className="bg-neutral-50/50 rounded-3xl p-6 sm:p-10 border border-neutral-100">
                            {t.terms.points.map((p, i) => (
                                <AccordionItem key={i} title={p.split(' ')[0] + ' ' + p.split(' ')[1] + '...'}>
                                    {p}
                                </AccordionItem>
                            ))}
                        </div>
                    </FadeInSection>
                </div>
            </section>

            {/* ── Section 6: Franchise Promo ── */}
            <section className="py-20 bg-emerald-50/50">
                <div className="container mx-auto px-6">
                    <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-[3rem] p-10 sm:p-20 text-center text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                        <div className="relative z-10 max-w-3xl mx-auto">
                            <h2 className="text-3xl sm:text-5xl font-display font-black mb-6">{t.franchisePromo.title}</h2>
                            <p className="text-lg sm:text-xl text-emerald-50 mb-10 opacity-90">{t.franchisePromo.subtitle}</p>
                            <Link
                                href="/franchise"
                                className="inline-block px-10 py-5 bg-white text-emerald-600 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-50 hover:scale-105 transition-all"
                            >
                                {t.franchisePromo.cta}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 7: Form ── */}
            <section id="register" className="py-24 sm:py-32 bg-emerald-950 relative overflow-hidden">
                {/* Pattern Background */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '30px 30px' }} />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <FadeInSection>
                                <div className="space-y-8">
                                    <h2 className="text-4xl sm:text-5xl font-display font-black text-white leading-tight">
                                        {t.form.title}
                                    </h2>
                                    <p className="text-xl text-emerald-100/60 leading-relaxed">
                                        {t.form.subtitle}
                                    </p>

                                    <div className="pt-8 space-y-4">
                                        <p className="text-sm font-bold text-white uppercase tracking-widest opacity-40">{t.form.altTitle}</p>
                                        <div className="flex flex-wrap gap-4">
                                            <a
                                                href={SITE.social.whatsapp}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                                            >
                                                <SiWhatsapp className="w-5 h-5" />
                                                {t.form.whatsapp}
                                            </a>
                                            <a
                                                href={`mailto:${SITE.email}`}
                                                className="flex items-center gap-3 px-6 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all"
                                            >
                                                <Mail className="w-5 h-5" />
                                                {t.form.email}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </FadeInSection>

                            <FadeInSection delay={200}>
                                <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-3xl relative">
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500 rounded-3xl opacity-10 -rotate-12" />
                                    <InquiryForm department="affiliate-program" />

                                    {/* Department Field Injection Mockup/Note */}
                                    <div className="mt-8 pt-8 border-t border-neutral-100 text-center">
                                        <p className="text-xs text-neutral-400 font-medium">
                                            Select "Affiliate Program" in the inquiry form if available.
                                        </p>
                                    </div>
                                </div>
                            </FadeInSection>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Animations Style ── */}
            <style jsx global>{`
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .bg-dashed {
          background-image: linear-gradient(to right, #d1d5db 50%, transparent 50%);
          background-size: 10px 1px;
          background-repeat: repeat-x;
        }
        [dir="rtl"] .bg-dashed {
          background-image: linear-gradient(to left, #d1d5db 50%, transparent 50%);
        }
      `}</style>
        </main>
    );
}
