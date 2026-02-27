import io

start_line = 1101 # 0-indexed index of line 1102
end_line = 1884 # 0-indexed index of line 1885

file_path = r"c:\Users\Mirza Computers\OneDrive\Desktop\khanhub\apps\job\src\app\dashboard\upload-video\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

NEW_CONTENT = """function ProfileGate({ user, onComplete }: {
    user: any;
    onComplete: () => void;
}) {
    const isEmployer = user?.role === 'employer';
    const [formData, setFormData] = useState({
        name: user?.name || user?.displayName || user?.companyName || '',
        phone: user?.phone || '',
        industry: user?.industry || user?.desiredIndustry || '',
        subcategory: user?.subcategory || user?.desiredSubcategory || '',
        desiredJobTitle: user?.desiredJobTitle || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checklist = [
        {
            label: isEmployer ? 'Company Name' : 'Full Name',
            complete: !!formData.name.trim()
        },
        { label: 'Phone Number', complete: !!formData.phone.trim() },
        { label: 'Industry', complete: !!formData.industry },
        ...(!isEmployer ? [{
            label: 'Job Title',
            complete: !!formData.desiredJobTitle
        }] : []),
    ];

    const isReady = checklist.every(i => i.complete);
    const completedCount = checklist.filter(i => i.complete).length;
    const progress = (completedCount / checklist.length) * 100;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isReady) return;
        setSaving(true);
        setError(null);
        try {
            const { doc, setDoc } = await import('firebase/firestore');
            const { db, auth } = await import('@/lib/firebase/firebase-config');
            const { updateProfile: fbUpdate } = await import('firebase/auth');

            const fields: any = {
                name: formData.name.trim(),
                displayName: formData.name.trim(),
                phone: formData.phone.trim(),
                industry: formData.industry,
                desiredIndustry: formData.industry,
                subcategory: formData.subcategory,
                desiredSubcategory: formData.subcategory,
                updatedAt: new Date(),
            };
            if (isEmployer) {
                fields.companyName = formData.name.trim();
            } else {
                fields.desiredJobTitle = formData.desiredJobTitle;
            }

            await setDoc(doc(db, 'users', user.uid), fields, { merge: true });

            if (auth.currentUser) {
                await fbUpdate(auth.currentUser, {
                    displayName: formData.name.trim()
                });
            }
            onComplete();
        } catch (err: any) {
            setError(err.message || 'Failed to save. Try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center animate-in fade-in duration-700">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">
                                    Complete Profile
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Required before uploading your video
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-blue-600 font-black text-xl italic">
                                    {Math.round(progress)}%
                                </span>
                                <div className="w-24 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-2xl p-6 mb-8 border border-blue-100">
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">
                                Required to Proceed
                            </h3>
                            <ul className="grid grid-cols-2 gap-3">
                                {checklist.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <div className={"w-4 h-4 rounded-full flex items-center justify-center border transition-colors " + (item.complete ? "bg-green-500 border-green-500 text-white" : "bg-white border-slate-200")}>
                                            {item.complete && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                        </div>
                                        <span className={"text-[10px] font-bold uppercase tracking-tight " + (item.complete ? "text-slate-900" : "text-slate-400")}>
                                            {item.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {isEmployer ? 'Company Name' : 'Full Name'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="03XXXXXXXXX"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Industry
                                </label>
                                <SearchableSelect
                                    options={INDUSTRIES.map(i => ({ id: i.id, label: i.label }))}
                                    value={formData.industry}
                                    onChange={(val) => setFormData({ ...formData, industry: val, subcategory: '', desiredJobTitle: '' })}
                                    placeholder="Select Industry..."
                                />
                            </div>

                            {!isEmployer && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Job Category
                                        </label>
                                        <SearchableSelect
                                            options={getSubcategories(formData.industry).map(s => ({ id: s.id, label: s.label }))}
                                            value={formData.subcategory}
                                            onChange={(val) => setFormData({ ...formData, subcategory: val, desiredJobTitle: '' })}
                                            placeholder="Select category..."
                                            disabled={!formData.industry}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Job Title You're Targeting
                                        </label>
                                        <SearchableSelect
                                            options={getRoles(formData.industry, formData.subcategory).map(r => ({ id: r, label: r }))}
                                            value={formData.desiredJobTitle}
                                            onChange={(val) => setFormData({ ...formData, desiredJobTitle: val })}
                                            placeholder="Select role..."
                                            disabled={!formData.subcategory}
                                        />
                                    </div>
                                </>
                            )}

                            {error && (
                                <p className="text-red-500 text-[10px] font-black uppercase text-center">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={!isReady || saving}
                                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 disabled:opacity-30 disabled:grayscale hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Continue'}
                                {!saving && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </form>
                    </div>

                    <div className="bg-orange-50 p-6 border-t border-orange-100">
                        <div className="flex gap-3">
                            <ShieldCheck className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-orange-800 font-bold leading-relaxed uppercase tracking-wide">
                                Only your industry and role are public. Contact details are hidden until you connect.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VideoContextForm({
    user,
    videoContext,
    setVideoContext
}: {
    user: any;
    videoContext: any;
    setVideoContext: (ctx: any) => void;
}) {
    const isEmployer = user?.role === 'employer';

    if (isEmployer) {
        return (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-500 space-y-4">
                <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">Hiring Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 focus-within:z-10">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role You're Hiring For</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Sales Manager"
                            value={videoContext.hiringFor || ''}
                            onChange={e => setVideoContext({ ...videoContext, hiringFor: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                        />
                    </div>
                    <div className="space-y-1.5 focus-within:z-10">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expected Experience</label>
                        <select
                            required
                            value={videoContext.expectedExperience || ''}
                            onChange={e => setVideoContext({ ...videoContext, expectedExperience: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                        >
                            <option value="">Select Range</option>
                            <option value="Fresher / 0-1 Year">Fresher / 0-1 Year</option>
                            <option value="1-3 Years">1-3 Years</option>
                            <option value="3-5 Years">3-5 Years</option>
                            <option value="5-10 Years">5-10 Years</option>
                            <option value="10+ Years">10+ Years</option>
                        </select>
                    </div>
                    <div className="space-y-1.5 focus-within:z-10 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Type</label>
                        <div className="flex gap-2">
                            {['Onsite', 'Remote', 'Hybrid'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setVideoContext({ ...videoContext, jobType: type })}
                                    className={"flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all " + (videoContext.jobType === type ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1.5 focus-within:z-10 md:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salary Range (PKR / Month)</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hide Salary</span>
                                <input
                                    type="checkbox"
                                    checked={videoContext.hideSalary || false}
                                    onChange={e => setVideoContext({ ...videoContext, hideSalary: e.target.checked })}
                                    className="accent-blue-600 w-4 h-4 cursor-pointer"
                                />
                            </label>
                        </div>
                        {!videoContext.hideSalary && (
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={videoContext.salaryMin || ''}
                                    onChange={e => setVideoContext({ ...videoContext, salaryMin: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                                />
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={videoContext.salaryMax || ''}
                                    onChange={e => setVideoContext({ ...videoContext, salaryMax: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Job Seeker Form
    return (
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-500 space-y-4">
            <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">Candidate Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 focus-within:z-10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role You're Targeting</label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Sales Executive"
                        value={videoContext.targetJobTitle || ''}
                        onChange={e => setVideoContext({ ...videoContext, targetJobTitle: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                    />
                </div>
                <div className="space-y-1.5 focus-within:z-10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Experience</label>
                    <select
                        required
                        value={videoContext.seekerExperience || ''}
                        onChange={e => setVideoContext({ ...videoContext, seekerExperience: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                    >
                        <option value="">Select Range</option>
                        <option value="Fresher / 0-1 Year">Fresher / 0-1 Year</option>
                        <option value="1-3 Years">1-3 Years</option>
                        <option value="3-5 Years">3-5 Years</option>
                        <option value="5-10 Years">5-10 Years</option>
                        <option value="10+ Years">10+ Years</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
"""

new_lines = lines[:start_line] + [NEW_CONTENT + "\\n"] + lines[end_line:]
with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Replaced lines 1102 to 1884 successfully")
