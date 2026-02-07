import { Phone, Mail, MapPin, Clock, MessageSquare } from 'lucide-react';

export const metadata = {
    title: 'Contact Us - Khanhub Enterprises',
    description: 'Get in touch with Khanhub Enterprises for all your office equipment and business solution needs.',
};

export default function ContactPage() {
    return (
        <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-primary-600 to-secondary-600 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center animate-fade-in-up">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
                        <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                            We're here to help! Reach out to us for any inquiries, bulk orders, or support.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Information & Form */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Contact Information */}
                        <div className="animate-fade-in-up">
                            <h2 className="text-3xl font-bold mb-8">Get In Touch</h2>

                            <div className="space-y-6">
                                {/* Phone */}
                                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:shadow-soft transition-all duration-300">
                                    <div className="p-3 bg-primary-100 rounded-lg">
                                        <Phone className="h-6 w-6 text-primary-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold mb-2">Phone</h3>
                                        <a href="tel:+923006395220" className="text-primary-600 hover:text-primary-700">
                                            +92 300 6395220
                                        </a>
                                        <p className="text-sm text-gray-600 mt-1">Mon-Sat, 9:00 AM - 8:00 PM</p>
                                    </div>
                                </div>

                                {/* WhatsApp */}
                                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:shadow-soft transition-all duration-300">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <MessageSquare className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold mb-2">WhatsApp</h3>
                                        <a
                                            href="https://wa.me/923006395220"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-600 hover:text-green-700"
                                        >
                                            +92 300 6395220
                                        </a>
                                        <p className="text-sm text-gray-600 mt-1">Quick responses, 24/7</p>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:shadow-soft transition-all duration-300">
                                    <div className="p-3 bg-secondary-100 rounded-lg">
                                        <Mail className="h-6 w-6 text-secondary-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold mb-2">Email</h3>
                                        <a href="mailto:info@khanhub.com" className="text-secondary-600 hover:text-secondary-700">
                                            info@khanhub.com
                                        </a>
                                        <p className="text-sm text-gray-600 mt-1">We'll respond within 24 hours</p>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:shadow-soft transition-all duration-300">
                                    <div className="p-3 bg-orange-100 rounded-lg">
                                        <MapPin className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold mb-2">Location</h3>
                                        <p className="text-gray-600">
                                            Serving all across Pakistan<br />
                                            Nationwide delivery available
                                        </p>
                                    </div>
                                </div>

                                {/* Business Hours */}
                                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:shadow-soft transition-all duration-300">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <Clock className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold mb-2">Business Hours</h3>
                                        <div className="text-gray-600 space-y-1">
                                            <p>Monday - Saturday: 9:00 AM - 8:00 PM</p>
                                            <p>Sunday: 10:00 AM - 6:00 PM</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="animate-fade-in-up animation-delay-200">
                            <div className="bg-white p-8 rounded-xl shadow-soft">
                                <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>

                                <form className="space-y-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold mb-2">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            className="input-field"
                                            placeholder="Your name"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-semibold mb-2">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            className="input-field"
                                            placeholder="your.email@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-semibold mb-2">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            className="input-field"
                                            placeholder="+92 300 0000000"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="subject" className="block text-sm font-semibold mb-2">
                                            Subject *
                                        </label>
                                        <input
                                            type="text"
                                            id="subject"
                                            name="subject"
                                            required
                                            className="input-field"
                                            placeholder="How can we help?"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="message" className="block text-sm font-semibold mb-2">
                                            Message *
                                        </label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            required
                                            rows={5}
                                            className="input-field resize-none"
                                            placeholder="Tell us more about your requirements..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 hover:shadow-hover active:scale-95"
                                    >
                                        Send Message
                                    </button>

                                    <p className="text-sm text-gray-600 text-center">
                                        We'll get back to you as soon as possible!
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Contact CTA */}
            <section className="bg-gray-50 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold mb-4">Need Immediate Assistance?</h2>
                        <p className="text-gray-600 mb-8">
                            For urgent inquiries or bulk orders, reach us directly
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        <a
                            href="tel:+923006395220"
                            className="bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                        >
                            <Phone className="h-5 w-5" />
                            Call Now
                        </a>
                        <a
                            href="https://wa.me/923006395220"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                        >
                            <MessageSquare className="h-5 w-5" />
                            WhatsApp Us
                        </a>
                        <a
                            href="mailto:info@khanhub.com"
                            className="bg-secondary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-secondary-700 transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                        >
                            <Mail className="h-5 w-5" />
                            Email Us
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
