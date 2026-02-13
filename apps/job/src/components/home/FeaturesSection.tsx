export default function FeaturesSection() {
    return (
        <section className="py-24 bg-teal-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="bg-white p-10 rounded-3xl shadow-sm border border-teal-100">
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl mb-6">🎯</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Matching</h3>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            Our platform uses advanced AI to match your unique skill set with the most relevant job openings in Pakistan.
                        </p>
                    </div>
                    <div className="bg-white p-10 rounded-3xl shadow-sm border border-teal-100">
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl mb-6">⚡</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Fast Apply</h3>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            Upload your CV once and apply to multiple verified positions with a single click. No more filling redundant forms.
                        </p>
                    </div>
                    <div className="bg-white p-10 rounded-3xl shadow-sm border border-teal-100">
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl mb-6">🛡️</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Verified Roles</h3>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            Every job post is vetted for authenticity. Apply with complete peace of mind to trusted Pakistani employers.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
