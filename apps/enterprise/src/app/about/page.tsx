import { Building2, Users, Award, TrendingUp, Shield, Heart } from 'lucide-react';

export const metadata = {
    title: 'About Us - Khanhub Enterprises',
    description: 'Learn about Khanhub Enterprises, your trusted partner for office equipment and business solutions in Pakistan.',
};

export default function AboutPage() {
    return (
        <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-primary-600 to-secondary-600 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center animate-fade-in-up">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">About Khanhub Enterprises</h1>
                        <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                            Your trusted partner for complete office and business solutions across Pakistan
                        </p>
                    </div>
                </div>
            </section>

            {/* Our Story */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="animate-fade-in-up">
                            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                            <div className="space-y-4 text-gray-600">
                                <p>
                                    Khanhub Enterprises was founded with a simple mission: to provide businesses across Pakistan
                                    with access to quality office equipment and supplies at competitive prices.
                                </p>
                                <p>
                                    What started as a small operation has grown into a trusted name in the industry, serving
                                    hundreds of businesses from startups to established enterprises. We understand that every
                                    business has unique needs and budgets, which is why we offer a diverse range of products
                                    from brand new imports to budget-friendly refurbished options.
                                </p>
                                <p>
                                    Today, we continue to expand our product range and improve our services, always keeping
                                    our customers' needs at the forefront of everything we do.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 animate-fade-in-up animation-delay-200">
                            <div className="bg-primary-50 p-6 rounded-xl text-center">
                                <div className="text-4xl font-bold text-primary-600 mb-2">500+</div>
                                <div className="text-gray-600">Happy Clients</div>
                            </div>
                            <div className="bg-secondary-50 p-6 rounded-xl text-center">
                                <div className="text-4xl font-bold text-secondary-600 mb-2">1000+</div>
                                <div className="text-gray-600">Products</div>
                            </div>
                            <div className="bg-green-50 p-6 rounded-xl text-center">
                                <div className="text-4xl font-bold text-green-600 mb-2">24/7</div>
                                <div className="text-gray-600">Support</div>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-xl text-center">
                                <div className="text-4xl font-bold text-orange-600 mb-2">All PK</div>
                                <div className="text-gray-600">Delivery</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Values */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 animate-fade-in-up">
                        <h2 className="text-3xl font-bold mb-4">Our Values</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            The principles that guide everything we do
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-xl shadow-soft hover:shadow-hover transition-all duration-300 animate-fade-in-up">
                            <div className="inline-block p-4 bg-primary-100 rounded-2xl mb-4">
                                <Shield className="h-8 w-8 text-primary-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Quality First</h3>
                            <p className="text-gray-600">
                                We ensure every product meets our high standards, whether it's brand new or refurbished.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-xl shadow-soft hover:shadow-hover transition-all duration-300 animate-fade-in-up animation-delay-100">
                            <div className="inline-block p-4 bg-green-100 rounded-2xl mb-4">
                                <Heart className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Customer Focus</h3>
                            <p className="text-gray-600">
                                Your satisfaction is our priority. We're here to help you find the perfect solutions for your business.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-xl shadow-soft hover:shadow-hover transition-all duration-300 animate-fade-in-up animation-delay-200">
                            <div className="inline-block p-4 bg-secondary-100 rounded-2xl mb-4">
                                <Award className="h-8 w-8 text-secondary-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Integrity</h3>
                            <p className="text-gray-600">
                                Honest pricing, transparent processes, and reliable service - that's our commitment to you.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* What We Offer */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 animate-fade-in-up">
                        <h2 className="text-3xl font-bold mb-4">What We Offer</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Comprehensive solutions for all your office needs
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="text-center p-6 animate-fade-in-up">
                            <div className="inline-block p-4 bg-green-100 rounded-2xl mb-4">
                                <TrendingUp className="h-10 w-10 text-green-600" />
                            </div>
                            <h3 className="font-bold mb-2">New Products</h3>
                            <p className="text-sm text-gray-600">Latest office equipment with full warranty</p>
                        </div>

                        <div className="text-center p-6 animate-fade-in-up animation-delay-100">
                            <div className="inline-block p-4 bg-blue-100 rounded-2xl mb-4">
                                <Building2 className="h-10 w-10 text-blue-600" />
                            </div>
                            <h3 className="font-bold mb-2">Imported Quality</h3>
                            <p className="text-sm text-gray-600">International brands and premium products</p>
                        </div>

                        <div className="text-center p-6 animate-fade-in-up animation-delay-200">
                            <div className="inline-block p-4 bg-purple-100 rounded-2xl mb-4">
                                <Users className="h-10 w-10 text-purple-600" />
                            </div>
                            <h3 className="font-bold mb-2">Local Products</h3>
                            <p className="text-sm text-gray-600">Supporting Pakistani manufacturers</p>
                        </div>

                        <div className="text-center p-6 animate-fade-in-up animation-delay-300">
                            <div className="inline-block p-4 bg-orange-100 rounded-2xl mb-4">
                                <Award className="h-10 w-10 text-orange-600" />
                            </div>
                            <h3 className="font-bold mb-2">Budget Options</h3>
                            <p className="text-sm text-gray-600">Quality refurbished equipment at great prices</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Let's discuss how we can help equip your business for success
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a
                            href="/contact"
                            className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                            Contact Us
                        </a>
                        <a
                            href="/products/new"
                            className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-primary-600 transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                            Browse Products
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
