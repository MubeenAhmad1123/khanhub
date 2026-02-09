export default function ProfilePage() {
    return (
        <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 text-center">
                <div className="w-24 h-24 bg-[#E6F1EC] text-[#2F5D50] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black">
                    M
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">Driver Profile</h1>
                <p className="text-gray-500 mb-8 font-medium">Profile details and verification status will appear here after document approval.</p>
                <div className="bg-yellow-50 text-yellow-700 p-4 rounded-2xl text-sm font-bold border border-yellow-100 mb-6">
                    Account Pending Verification
                </div>
                <button className="w-full py-4 bg-[#2F5D50] hover:bg-[#3FA58E] text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg">
                    Upload Documents
                </button>
            </div>
        </div>
    );
}
