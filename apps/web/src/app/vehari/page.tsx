import { Metadata } from 'next';
import Link from 'next/link';
import { generateLocalMetadata, generateLocalSchema } from '@/lib/seo';
import { 
  Heart, 
  MapPin, 
  Phone, 
  Clock, 
  Calendar, 
  Award, 
  ArrowRight, 
  Users, 
  Activity, 
  HelpCircle,
  FileText
} from 'lucide-react';

const localSEOProps = {
  city: 'Vehari',
  title: "Best Medical Center & Welfare Organization in Vehari | Khan Hub",
  description: "Khan Hub Vehari is our central headquarters providing 24/7 free ambulance services, state-of-the-art lab tests, surgical operations, digital education, and sukoon rehabilitation programs.",
  keywords: [
    'best medical center in vehari',
    'free ambulance service vehari',
    'khan hub vehari',
    'welfare organization in vehari',
    'free lab tests vehari',
    'hospital in vehari'
  ],
  address: 'KHAN HUB (PVT.) LTD. Multan road Pir Murad, Vehari',
  locality: 'Vehari',
  postalCode: '61100',
  latitude: '30.0444',
  longitude: '72.3556',
  faqs: [
    {
      question: 'What free medical services does Khan Hub provide in Vehari?',
      answer: 'Khan Hub Vehari offers a comprehensive range of healthcare services including 24/7 free ambulance dispatch, fully equipped laboratory testing, outpatient consultations, and minor surgical operations.'
    },
    {
      question: 'Where is Khan Hub located in Vehari?',
      answer: 'Our main welfare center and headquarters are located at Multan Road, Peer Muraad, Vehari, Punjab.'
    },
    {
      question: 'How can I donate or volunteer at the Vehari branch?',
      answer: 'You can visit our main center or click our Donate button to support. For volunteering opportunities, reach out via our 24/7 helpline at 0300-6395220.'
    }
  ]
};

export const metadata: Metadata = generateLocalMetadata(localSEOProps);

export default function VehariCityPage() {
  return (
    <main className="min-h-screen bg-neutral-50 relative overflow-x-hidden">
      {/* JSON-LD Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateLocalSchema(localSEOProps)}
      />

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[70vh] flex items-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-primary-950 py-24 text-white">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-neutral-50 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative w-full">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 px-4 py-2 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></span>
              <span className="text-sm font-black tracking-wider uppercase text-primary-300">Central Headquarters</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Empowering Lives in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-success-400 to-primary-300">Vehari</span> Through Care
            </h1>
            <p className="text-lg md:text-xl text-neutral-300 leading-relaxed max-w-2xl">
              As Khan Hub's central anchor, our Vehari facility coordinates healthcare, education, vocational training, and social welfare across the entire region.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/donate"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-success-500 hover:bg-success-600 active:bg-success-700 text-white font-bold rounded-2xl shadow-lg shadow-success-500/20 hover:shadow-success-500/30 transition-all hover:scale-105"
              >
                <Heart className="w-5 h-5 fill-white/20" />
                <span>Support Our Cause</span>
              </Link>
              <a
                href="tel:03006395220"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-white font-bold rounded-2xl backdrop-blur-md transition-all hover:scale-105"
              >
                <Phone className="w-5 h-5" />
                <span>24/7 Support: 0300-6395220</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="relative -mt-16 z-10 max-w-7xl mx-auto px-6">
        <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xl p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 backdrop-blur-md">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-4xl md:text-5xl font-black text-primary-600">50,000+</span>
            <h3 className="font-extrabold text-neutral-800">Lives Impacted</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">Providing continuous welfare, medical help, and support to Vehari residents.</p>
          </div>
          <div className="space-y-2 border-y md:border-y-0 md:border-x border-neutral-200 py-6 md:py-0 md:px-8 text-center md:text-left">
            <span className="text-4xl md:text-5xl font-black text-success-600">12,000+</span>
            <h3 className="font-extrabold text-neutral-800">Patients Treated</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">Access to premium medical care, expert diagnostics, and free treatments daily.</p>
          </div>
          <div className="space-y-2 text-center md:text-left">
            <span className="text-4xl md:text-5xl font-black text-primary-500">24/7</span>
            <h3 className="font-extrabold text-neutral-800">Emergency Dispatch</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">Swift ambulance services responding to emergency calls across Vehari villages.</p>
          </div>
        </div>
      </section>

      {/* ── DEPARTMENTS AND SERVICES ── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-neutral-900 tracking-tight">Our Local Specialized Services</h2>
          <p className="text-neutral-600 font-medium">Delivering state-of-the-art facilities and qualified professional caretakers to Vehari.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-neutral-200/80 hover:border-primary-300 transition-all shadow-sm hover:shadow-md group">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-neutral-900 mb-3">Medical Diagnostics & Lab</h3>
            <p className="text-neutral-600 text-sm leading-relaxed mb-6">Fully integrated clinic providing affordable and fast reports with physical shift logging and accuracy verification.</p>
            <Link href="/departments/hospital" className="inline-flex items-center gap-2 text-primary-600 font-bold text-sm hover:underline">
              <span>View Department</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-neutral-200/80 hover:border-success-300 transition-all shadow-sm hover:shadow-md group">
            <div className="w-12 h-12 rounded-2xl bg-success-50 flex items-center justify-center text-success-600 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-neutral-900 mb-3">Sukoon Rehabilitation Center</h3>
            <p className="text-neutral-600 text-sm leading-relaxed mb-6">Offering continuous mental healthcare, physical therapy, and addiction recovery services under specialist care.</p>
            <Link href="/departments/rehab" className="inline-flex items-center gap-2 text-success-600 font-bold text-sm hover:underline">
              <span>View Department</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-neutral-200/80 hover:border-primary-300 transition-all shadow-sm hover:shadow-md group">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-500 mb-6 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-neutral-900 mb-3">Welfare & Education Center</h3>
            <p className="text-neutral-600 text-sm leading-relaxed mb-6">Empowering students with modern textbooks, computer labs, digital literacies, and registered support structures.</p>
            <Link href="/departments/education" className="inline-flex items-center gap-2 text-primary-500 font-bold text-sm hover:underline">
              <span>View Department</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── ADDRESS CARD ── */}
      <section className="py-12 bg-neutral-100/50 border-y border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-neutral-900">Visit Our Vehari Center</h2>
            <p className="text-neutral-600 leading-relaxed">Our central branch operates 24 hours a day to handle emergency relief. We encourage you to schedule visits for diagnostics and support consultations.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-neutral-200">
                <MapPin className="w-6 h-6 text-primary-600 shrink-0" />
                <span className="text-neutral-700 font-bold text-sm">{localSEOProps.address}</span>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-neutral-200">
                <Clock className="w-6 h-6 text-success-600 shrink-0" />
                <span className="text-neutral-700 font-bold text-sm">Open 24 Hours / 7 Days a Week</span>
              </div>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden border border-neutral-200 shadow-lg h-[350px] relative">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3434.5615694389025!2d72.3556!3d30.0444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAyJzM5LjgiTiA3MsKwMjEnMjAuMiJF!5e0!3m2!1sen!2spk!4v1700000000000!5m2!1sen!2spk" 
              className="absolute inset-0 w-full h-full border-0" 
              allowFullScreen={true} 
              loading="lazy"
              title="Khan Hub Vehari Google Map"
            />
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="py-24 max-w-5xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <HelpCircle className="w-12 h-12 text-primary-500 mx-auto" />
          <h2 className="text-3xl font-black text-neutral-900">Frequently Asked Questions</h2>
          <p className="text-neutral-600 font-medium">Answers to common inquiries about our services in Vehari.</p>
        </div>

        <div className="space-y-6">
          {localSEOProps.faqs.map((faq, idx) => (
            <div key={idx} className="bg-white p-6 md:p-8 rounded-3xl border border-neutral-200/80 shadow-sm space-y-3">
              <h3 className="text-lg font-black text-neutral-900 flex items-start gap-3">
                <span className="text-primary-600">Q:</span>
                <span>{faq.question}</span>
              </h3>
              <p className="text-neutral-600 leading-relaxed text-sm md:text-base pl-7">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
