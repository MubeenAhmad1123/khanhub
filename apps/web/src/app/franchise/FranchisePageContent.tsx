'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Building2,
    CheckCircle2,
    Users,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    MessageCircle,
    Mail,
    ArrowRight,
    Briefcase,
    GraduationCap,
    Stethoscope,
    HeartPulse,
    Globe
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { SITE } from '@/data/site';
import InquiryForm from '@/components/forms/InquiryForm';

// --- Types ---
type Language = 'en' | 'ur';

const CONTENT = {
    en: {
        hero: {
            badge: "Invest in the Future",
            title: "Build Your Own Legacy with KhanHub Franchising",
            subtitle: "Get exclusive rights to operate KhanHub departments in your region. High ROI, proven systems, and massive community impact.",
            cta: "Apply for Franchise"
        },
        whyFranchise: {
            title: "Why Partner with KhanHub?",
            p1: "KhanHub is more than a brand; it's a symbol of trust and quality across Pakistan. By getting a franchise, you step into a pre-built ecosystem of success.",
            p2: "We offer competitive rates and full operational support to ensure your department thrives. From healthcare to education, our models are designed for scalability.",
            features: [
                { title: "Proven Brand", text: "Leverage years of trust and a solid reputation.", icon: Building2 },
                { title: "Expert Support", text: "Complete guidance on setup and operations.", icon: CheckCircle2 },
                { title: "High Demand", text: "Our services are essential and always in demand.", icon: TrendingUp },
                { title: "Scalable Model", text: "Easy to expand once you master the basics.", icon: Globe }
            ]
        },
        departments: {
            title: "Franchise Categories",
            subtitle: "Choose the department that aligns with your vision and investment.",
            cards: [
                {
                    name: "KhanHub Hospital",
                    image: "/images/medical-center.webp",
                    benefit: "Essential Healthcare",
                    desc: "State-of-the-art medical facilities with a focus on affordability and quality care.",
                    color: "blue"
                },
                {
                    name: "School Center",
                    image: "/images/education.webp",
                    benefit: "Quality Education",
                    desc: "Modern teaching methodologies and curriculum to shape the next generation.",
                    color: "yellow"
                },
                {
                    name: "Job Center",
                    image: "/images/job.webp",
                    benefit: "Employment Solutions",
                    desc: "Connecting talent with opportunity through our extensive corporate network.",
                    color: "orange"
                },
                {
                    name: "Rehab Center",
                    image: "/images/rehab.webp",
                    benefit: "Life Transformation",
                    desc: "Specialized care for addiction and mental health recovery.",
                    color: "red"
                },
                {
                    name: "Health Sciences Institute",
                    image: "/images/institute-health-sciences.webp",
                    benefit: "Medical Training",
                    desc: "Certified paramedical and nursing courses to build a skilled workforce.",
                    color: "teal"
                },
                {
                    name: "Enterprise Solutions",
                    image: "/images/software-solutions.webp",
                    benefit: "B2B Services",
                    desc: "IT and professional services for businesses looking to scale.",
                    color: "indigo"
                }
            ]
        },
        process: {
            title: "How to Get Started",
            steps: [
                { title: "Inquiry", text: "Submit your interest through our form or WhatsApp." },
                { title: "Evaluation", text: "Our team reviews your location and investment capacity." },
                { title: "Agreement", text: "Finalize the terms and sign the franchise agreement." },
                { title: "Launch", text: "Receive training, setup support, and go live!" }
            ]
        },
        form: {
            title: "Begin Your Journey",
            subtitle: "Fill out the form below and our franchise manager will reach out within 48 hours.",
            altTitle: "Direct Contact",
            whatsapp: "WhatsApp Us",
            email: "Email Inquiry"
        }
    },
    ur: {
        hero: {
            badge: "مستقبل میں سرمایہ کاری کریں",
            title: "خان ہب فرنچائزنگ کے ساتھ اپنی وراثت بنائیں",
            subtitle: "اپنے علاقے میں خان ہب کے شعبے چلانے کے خصوصی حقوق حاصل کریں۔ بہتر منافع، ثابت شدہ نظام، اور بڑے پیمانے پر معاشرتی اثر۔",
            cta: "فرنچائز کے لیے اپلائی کریں"
        },
        whyFranchise: {
            title: "خان ہب کے ساتھ شراکت داری کیوں؟",
            p1: "خان ہب صرف ایک برانڈ نہیں ہے؛ یہ پاکستان بھر میں اعتماد اور معیار کی علامت ہے۔ فرنچائز حاصل کر کے، آپ کامیابی کے بنے بنائے ایکو سسٹم میں قدم رکھتے ہیں۔",
            p2: "ہم آپ کے شعبے کی ترقی کو یقینی بنانے کے لیے مسابقتی شرحیں اور مکمل آپریشنل سپورٹ پیش کرتے ہیں۔ صحت سے لے کر تعلیم تک، ہمارے ماڈل وسعت کے لیے ڈیزائن کیے گئے ہیں۔",
            features: [
                { title: "ثابت شدہ برانڈ", text: "برسوں کے اعتماد اور ٹھوس شہرت کا فائدہ اٹھائیں۔", icon: Building2 },
                { title: "ماہرانہ تعاون", text: "سیٹ اپ اور آپریشنز پر مکمل رہنمائی۔", icon: CheckCircle2 },
                { title: "زیادہ مانگ", text: "ہماری خدمات ضروری ہیں اور ہمیشہ مانگ میں رہتی ہیں۔", icon: TrendingUp },
                { title: "قابل توسیع ماڈل", text: "بنیادی باتیں سیکھنے کے بعد توسیع کرنا آسان ہے۔", icon: Globe }
            ]
        },
        departments: {
            title: "فرنچائز کے زمرے",
            subtitle: "اس شعبے کا انتخاب کریں جو آپ کے وژن اور سرمایہ کاری کے مطابق ہو۔",
            cards: [
                {
                    name: "خان ہب ہسپتال",
                    image: "/images/medical-center.webp",
                    benefit: "ضروری صحت",
                    desc: "سستی اور معیاری دیکھ بھال پر توجہ کے ساتھ جدید طبی سہولیات۔",
                    color: "blue"
                },
                {
                    name: "اسکول سینٹر",
                    image: "/images/education.webp",
                    benefit: "معیاری تعلیم",
                    desc: "اگلی نسل کی تشکیل کے لیے جدید تدریسی طریقہ کار اور نصاب۔",
                    color: "yellow"
                },
                {
                    name: "جوب سینٹر",
                    image: "/images/job.webp",
                    benefit: "روزگار کے حل",
                    desc: "ہمارے وسیع کارپوریٹ نیٹ ورک کے ذریعے ٹیلنٹ کو موقع سے جوڑنا۔",
                    color: "orange"
                },
                {
                    name: "ری ہیب سینٹر",
                    image: "/images/rehab.webp",
                    benefit: "زندگی کی تبدیلی",
                    desc: "نشے کی لت اور دماغی صحت کی بحالی کے لیے خصوصی دیکھ بھال۔",
                    color: "red"
                },
                {
                    name: "ہیلتھ سائنسز انسٹی ٹیوٹ",
                    image: "/images/institute-health-sciences.webp",
                    benefit: "طبی تربیت",
                    desc: "ایک ہنر مند افرادی قوت بنانے کے لیے تصدیق شدہ پیرامیڈیکل اور نرسنگ کورسز۔",
                    color: "teal"
                },
                {
                    name: "انٹرپرائز سلوشنز",
                    image: "/images/software-solutions.webp",
                    benefit: "B2B خدمات",
                    desc: "کاروبار کو وسعت دینے کے لیے آئی ٹی اور پیشہ ورانہ خدمات۔",
                    color: "indigo"
                }
            ]
        },
        process: {
            title: "شروع کرنے کا طریقہ",
            steps: [
                { title: "انکوائری", text: "ہمارے فارم یا واٹس ایپ کے ذریعے اپنی دلچسپی کا اظہار کریں۔" },
                { title: "تشخیص", text: "ہماری ٹیم آپ کے مقام اور سرمایہ کاری کی صلاحیت کا جائزہ لیتی ہے۔" },
                { title: "معاہدہ", text: "شرائط کو حتمی شکل دیں اور فرنچائز معاہدے پر دستخط کریں۔" },
                { title: "لانچ", text: "تربیت، سیٹ اپ سپورٹ حاصل کریں اور کام شروع کریں!" }
            ]
        },
        form: {
            title: "اپنا سفر شروع کریں",
            subtitle: "نیچے دیا گیا فارم پُر کریں اور ہمارا فرنچائز مینیجر 48 گھنٹوں کے اندر رابطہ کرے گا۔",
            altTitle: "براہ راست رابطہ",
            whatsapp: "واٹس ایپ کریں",
            email: "ای میل انکوائری"
        }
    }
};

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
            className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export default function FranchisePageContent() {
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
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 z-0">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <FadeInSection>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-indigo-100 text-xs sm:text-sm font-bold uppercase tracking-widest mb-8">
                                <Building2 className="w-4 h-4" />
                                {t.hero.badge}
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black text-white leading-[1.1] mb-8">
                                {t.hero.title}
                            </h1>
                            <p className="text-lg sm:text-xl text-indigo-50/80 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                                {t.hero.subtitle}
                            </p>
                            <Link
                                href="#apply"
                                className="inline-block px-10 py-5 bg-white text-indigo-900 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-black/20 hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all text-center"
                            >
                                {t.hero.cta}
                            </Link>
                        </FadeInSection>
                    </div>
                </div>
            </section>

            {/* ── Section 2: Why Franchise ── */}
            <section className="py-24 sm:py-32 bg-white">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <FadeInSection>
                            <div className="space-y-6">
                                <div className="w-16 h-1 bg-indigo-500 rounded-full mb-8" />
                                <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 leading-tight">
                                    {t.whyFranchise.title}
                                </h2>
                                <p className="text-base sm:text-lg text-neutral-600">{t.whyFranchise.p1}</p>
                                <p className="text-base sm:text-lg text-neutral-600">{t.whyFranchise.p2}</p>
                            </div>
                        </FadeInSection>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {t.whyFranchise.features.map((feature, idx) => (
                                <FadeInSection key={idx} delay={idx * 100}>
                                    <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 hover:border-indigo-200 transition-colors group">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                            <feature.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-neutral-900 mb-2">{feature.title}</h3>
                                        <p className="text-sm text-neutral-500 leading-relaxed">{feature.text}</p>
                                    </div>
                                </FadeInSection>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 3: Categories ── */}
            <section className="py-24 sm:py-32 bg-neutral-50">
                <div className="container mx-auto px-6 text-center">
                    <FadeInSection>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-4">{t.departments.title}</h2>
                        <p className="text-neutral-500 mb-16">{t.departments.subtitle}</p>
                    </FadeInSection>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {t.departments.cards.map((card, idx) => (
                            <FadeInSection key={idx} delay={idx * 100}>
                                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 group">
                                    <div className="relative h-48">
                                        <Image src={card.image} alt={card.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-black/20" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase text-indigo-600">{card.benefit}</div>
                                    </div>
                                    <div className="p-8">
                                        <h3 className="text-xl font-bold mb-4">{card.name}</h3>
                                        <p className="text-neutral-600 text-sm leading-relaxed">{card.desc}</p>
                                    </div>
                                </div>
                            </FadeInSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Section 4: Process ── */}
            <section className="py-24 sm:py-32 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <FadeInSection>
                            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-4">{t.process.title}</h2>
                            <div className="w-16 h-1 bg-indigo-500 mx-auto rounded-full" />
                        </FadeInSection>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {t.process.steps.map((step, idx) => (
                            <FadeInSection key={idx} delay={idx * 150}>
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-2xl font-black mx-auto mb-6 shadow-xl shadow-indigo-600/20">
                                        {idx + 1}
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                                    <p className="text-sm text-neutral-500 leading-relaxed">{step.text}</p>
                                </div>
                            </FadeInSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Section 5: Form ── */}
            <section id="apply" className="py-24 sm:py-32 bg-indigo-950 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 0)', backgroundSize: '30px 30px' }} />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <FadeInSection>
                            <h2 className="text-4xl sm:text-5xl font-display font-black text-white mb-6">{t.form.title}</h2>
                            <p className="text-xl text-indigo-100/60 mb-12">{t.form.subtitle}</p>

                            <div className="space-y-4">
                                <p className="text-sm font-bold text-white/40 uppercase tracking-widest">{t.form.altTitle}</p>
                                <div className="flex flex-wrap gap-4">
                                    <a href={SITE.social.whatsapp} className="flex items-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all">
                                        <SiWhatsapp className="w-5 h-5" /> {t.form.whatsapp}
                                    </a>
                                    <a href={`mailto:${SITE.email}`} className="flex items-center gap-3 px-6 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all">
                                        <Mail className="w-5 h-5" /> {t.form.email}
                                    </a>
                                </div>
                            </div>
                        </FadeInSection>

                        <FadeInSection delay={200}>
                            <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-3xl">
                                <InquiryForm department="franchise-inquiry" />
                            </div>
                        </FadeInSection>
                    </div>
                </div>
            </section>
        </main>
    );
}
