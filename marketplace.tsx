import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom' 
import { Search, MapPin, Shield, Building2, Briefcase, X, MessageCircle, TrendingUp, Clock, Users, Info, ExternalLink, ArrowRight, Lock, LogOut, Loader2, HardHat, Award, Star, Mail, Phone, Globe, Sparkles, Calendar, CreditCard } from 'lucide-react'
import { getVendors, getProjects, getExperts, searchExpertsAI, searchProjectsAI, searchFirmsAI, Vendor, Project, Expert } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

// --- CONSTANTS ---
const SEARCH_CATEGORIES = {
  "All": ["Search for experts...", "Try 'Green Building'...", "Search 'Project Manager'..."],
  "Firms": ["Search firms...", "Search by rank..."],
  "Projects": ["Search projects...", "Search by city..."],
  "Experts": ["Search experts...", "Describe what you need..."]
};
type CategoryType = keyof typeof SEARCH_CATEGORIES;

const Marketplace = () => {
  const navigate = useNavigate();
  
  // 🛡️ SAFE USER PARSING
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(() => {
      try {
          const stored = localStorage.getItem('user');
          return stored ? JSON.parse(stored) : null;
      } catch (e) {
          console.error("Failed to parse user", e);
          return null;
      }
  });

  const [viewMode, setViewMode] = useState<'firms' | 'projects' | 'experts'>('experts')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null)

  const [placeholder, setPlaceholder] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- DATA LOADING ---
  const loadData = async () => {
      setLoading(true);
      try {
        const [vData, pData, eData] = await Promise.all([
            getVendors().catch(() => []),
            getProjects().catch(() => []),
            getExperts().catch(() => [])
        ]);
        setVendors(vData);
        setProjects(pData);
        setExperts(eData);
      } catch (e) {
        console.error("Partial load failure", e);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => { loadData(); }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        setLoading(true);
        try {
            if (!searchQuery.trim()) {
                if (viewMode === 'experts') setExperts(await getExperts());
                if (viewMode === 'projects') setProjects(await getProjects());
                if (viewMode === 'firms') setVendors(await getVendors());
            } else {
                if (viewMode === 'experts') {
                    const data = await searchExpertsAI(searchQuery);
                    setExperts(data);
                } else if (viewMode === 'projects') {
                    const data = await searchProjectsAI(searchQuery);
                    setProjects(data);
                } else if (viewMode === 'firms') {
                    const data = await searchFirmsAI(searchQuery); // <--- THIS WAS MISSING
                    setVendors(data);
                }
            }
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setLoading(false);
        }
    }
  };

  const handleClearSearch = async () => {
      setSearchQuery('');
      setLoading(true);
      if (viewMode === 'experts') setExperts(await getExperts());
      if (viewMode === 'projects') setProjects(await getProjects());
      if (viewMode === 'firms') setVendors(await getVendors()); // ✅ Added Missing Line
      setLoading(false);
  };

  // --- TYPEWRITER ---
  useEffect(() => {
    const currentPhrases = SEARCH_CATEGORIES[selectedCategory] || SEARCH_CATEGORIES["All"];
    const currentPhrase = currentPhrases[phraseIndex % currentPhrases.length];
    const typeSpeed = isDeleting ? 30 : 50;
    
    let timer: NodeJS.Timeout;
    if (!isDeleting && charIndex < currentPhrase.length) {
      timer = setTimeout(() => { setPlaceholder(currentPhrase.substring(0, charIndex + 1)); setCharIndex(prev => prev + 1); }, typeSpeed);
    } else if (!isDeleting && charIndex === currentPhrase.length) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && charIndex > 0) {
      timer = setTimeout(() => { setPlaceholder(currentPhrase.substring(0, charIndex - 1)); setCharIndex(prev => prev - 1); }, typeSpeed);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false); setPhraseIndex(prev => prev + 1);
    }
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, phraseIndex, selectedCategory]);

  useEffect(() => { setPlaceholder(""); setCharIndex(0); setIsDeleting(false); }, [selectedCategory]);

  // --- FILTERING ---
  const allSpecialties = Array.from(new Set(
    viewMode === 'firms' ? vendors.flatMap(v => v.specialties) : 
    viewMode === 'projects' ? projects.map(p => p.category) :
    experts.flatMap(e => e.expertise || [])
  )).sort().filter(Boolean);
  
  const filteredItems = (
    viewMode === 'firms' ? vendors : 
    viewMode === 'projects' ? projects : experts
  ).filter((item: any) => {
    // if (viewMode === 'firms' && searchQuery) {
    //     return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    // }
    const matchesSpecialty = selectedSpecialty === '' 
      ? true 
      : viewMode === 'firms' ? item.specialties.includes(selectedSpecialty) 
      : viewMode === 'projects' ? item.category === selectedSpecialty
      : item.expertise.includes(selectedSpecialty);
    return matchesSpecialty;
  })

  const FirmCard = ({ vendor }: { vendor: Vendor }) => (
    <div className="h-[340px] w-full">
        <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-gray-100 rounded-[2rem] overflow-hidden bg-white flex flex-col">
            <div className="h-48 relative shrink-0">
                <img 
                    src={vendor.image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800"} 
                    className="w-full h-full object-cover" 
                    alt={vendor.name}
                />
                {vendor.verified && <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg"><Shield className="w-4 h-4" /></div>}
            </div>
            <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl text-text-heading">{vendor.name}</h3>
                    <span className="text-sm font-bold text-primary-500">#{vendor.rank}</span>
                </div>
                <p className="text-sm text-text-body line-clamp-2 mb-4">{vendor.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {(vendor.specialties || []).slice(0, 3).map(s => <Badge key={s} className="bg-gray-100 text-gray-600 border-none text-[10px]">{s}</Badge>)}
                </div>
            </CardContent>
        </Card>
    </div>
  )

  const ProjectCard = ({ project, onClick }: { project: Project, onClick: () => void }) => (
    <div onClick={onClick} className="cursor-pointer group h-[340px] w-full">
        <Card className="h-full border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] p-8 flex flex-col justify-between bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-bl-[4rem] -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div>
                <div className="flex gap-2 mb-6 relative z-10 justify-between">
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 px-3 py-1 font-semibold">{project.category}</Badge>
                    {project.matchScore && (
                        <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-lg border border-green-200 shadow-sm">
                            <Sparkles className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-bold text-green-700">{project.matchScore}%</span>
                        </div>
                    )}
                </div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 mb-3 leading-tight group-hover:text-primary-600 transition-colors">{project.title}</h3>
                <div className="flex items-center gap-2 text-slate-500 font-medium"><Briefcase className="w-4 h-4 text-primary-400" /> {project.firmName}</div >
            </div>
            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400 font-medium"><MapPin className="w-4 h-4" /> {project.locationCity}</div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </div>
        </Card>
    </div>
  )

  const ExpertCard = ({ expert, onClick }: { expert: Expert, onClick: () => void }) => (
    <div onClick={onClick} className="cursor-pointer group h-[340px] w-full">
        <Card className="h-full border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] p-8 flex flex-col justify-between bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-[4rem] -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-16 h-16 rounded-full bg-gray-200 border-4 border-white shadow-sm overflow-hidden">
                      <img src={expert.image} className="w-full h-full object-cover"/>
                   </div>
                   {expert.matchScore ? (
                        <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-lg border border-green-200 shadow-sm">
                            <Sparkles className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-bold text-green-700">{expert.matchScore}% Match</span>
                        </div>
                   ) : (
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-bold text-yellow-700">{expert.rating}</span>
                        </div>
                   )}
                </div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 mb-1 leading-tight group-hover:text-primary-600 transition-colors">{expert.name}</h3>
                <div className="text-sm font-medium text-gray-500 mb-4">{expert.firm}</div>
                <div className="flex flex-wrap gap-2 mb-4">
                    {expert.expertise.slice(0, 2).map(skill => (
                        <Badge key={skill} className="bg-orange-50 text-orange-700 border-orange-100 px-2 py-0.5 text-[10px]">{skill}</Badge>
                    ))}
                    {expert.expertise.length > 2 && <span className="text-xs text-gray-400">+{expert.expertise.length - 2}</span>}
                </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400 font-medium"><MapPin className="w-4 h-4" /> {expert.location}</div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </div>
        </Card>
    </div>
  )

  const LoadingGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-50">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-[340px] bg-gray-100 rounded-[2rem] animate-pulse" />)}
    </div>
  );

  return (
    <div className={`min-h-screen bg-bg-base font-sans pt-24 pb-20 relative ${!user ? 'h-screen overflow-hidden' : ''}`}>
      {!user && <div className="absolute inset-0 z-40 bg-white/40 backdrop-blur-sm flex items-center justify-center"><Button onClick={() => navigate('/login')}>Sign In</Button></div>}

      {user && (
          <div className="absolute top-6 right-8 z-50 flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-xs">{user.name.charAt(0).toUpperCase()}</div>
                <span className="text-gray-700 font-bold text-sm hidden md:block">{user.name}</span>
                <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
                <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 transition-colors" title="Logout"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
      )}

      {/* EXPANDED MODAL (Projects) */}
      <AnimatePresence>
        {selectedProjectId && user && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProjectId(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" />
            <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 pointer-events-none">
              {projects.filter(p => p.id === selectedProjectId).map(project => (
                 <ExpandedProjectCard key={project.id} project={project} onClose={() => setSelectedProjectId(null)} />
              ))}
            </div>
          </>
        )}
        
        {selectedExpertId && user && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedExpertId(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" />
            <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 pointer-events-none">
              {experts.filter(e => e.id === selectedExpertId).map(expert => (
                 <ExpandedExpertCard key={expert.id} expert={expert} onClose={() => setSelectedExpertId(null)} />
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="container">
         <div className="text-center mb-10">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-extrabold text-text-heading mb-4 font-heading">
                {viewMode === 'firms' ? 'Expert Marketplace' : viewMode === 'projects' ? 'Project Discovery' : 'Talent Network'}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl text-text-body max-w-2xl mx-auto">
                Connect with top-tier professionals and explore verified project portfolios.
            </motion.p>
         </div>

         <div className="max-w-6xl mx-auto mb-12 space-y-6">
            <div className="flex justify-center">
                <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm inline-flex">
                    <button onClick={() => setViewMode('firms')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${viewMode === 'firms' ? 'bg-primary-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Firms</div>
                    </button>
                    <button onClick={() => setViewMode('projects')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${viewMode === 'projects' ? 'bg-primary-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Projects</div>
                    </button>
                    <button onClick={() => setViewMode('experts')} className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${viewMode === 'experts' ? 'bg-primary-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-2"><HardHat className="w-4 h-4" /> Experts</div>
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-3xl shadow-lg p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 text-left border border-gray-100">
                <div className="lg:col-span-2 relative">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <Input 
                        placeholder={placeholder} 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        onKeyDown={handleSearch} 
                        className="pl-12 h-12 rounded-xl border-gray-200 focus:ring-primary-500" 
                    />
                </div>
                <div className="lg:col-span-1">
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as CategoryType)} className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-primary-500 outline-none">
                        {Object.keys(SEARCH_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat === 'All' ? 'Query Type' : cat}</option>)}
                    </select>
                </div>
                <div className="lg:col-span-1">
                    <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-primary-500 outline-none">
                        <option value="">All Categories</option>
                        {allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
         </div>

         {loading ? <LoadingGrid /> : (
            <>
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <Users className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">We are adding more experts for you</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            We couldn't find a perfect match for "{searchQuery}" right now.
                        </p>
                        <div className="flex gap-4">
                            <Button onClick={handleClearSearch} variant="outline">Clear Search</Button>
                            <Button onClick={loadData}>Reload Data</Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredItems.map((item: any) => {
                            const key = item.id || Math.random(); 
                            if (viewMode === 'firms') return <FirmCard key={key} vendor={item} />;
                            if (viewMode === 'projects') return <ProjectCard key={key} project={item} onClick={() => user && setSelectedProjectId(item.id)} />;
                            if (viewMode === 'experts') return <ExpertCard key={key} expert={item} onClick={() => user && setSelectedExpertId(item.id)} />;
                        })}
                    </div>
                )}
            </>
         )}
      </div>
    </div>
  )
}

const ExpandedProjectCard = ({ project, onClose }: { project: Project, onClose: () => void }) => (
    <motion.div layoutId={`card-${project.id}`} className="bg-white w-full max-w-6xl h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors"><X className="w-6 h-6" /></button>
        <div className="w-full md:w-4/12 h-64 md:h-full relative shrink-0">
            <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} src={project.imageUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/50" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <motion.div layoutId={`badges-${project.id}`} className="flex flex-wrap gap-2 mb-4"><Badge className="bg-primary-500 text-white border-none px-3 py-1 text-sm">{project.category}</Badge><Badge className="bg-white/20 text-white border-none backdrop-blur-md px-3 py-1 text-sm">{project.completedDate}</Badge></motion.div>
                <motion.h3 layoutId={`title-${project.id}`} className="text-3xl font-bold font-heading mb-2 leading-tight">{project.title}</motion.h3>
                <motion.div layoutId={`firm-${project.id}`} className="text-lg text-gray-200 font-medium">{project.firmName}</motion.div>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-8 text-slate-800">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-gray-400 text-xs font-bold uppercase mb-1">Final Cost</div><div className="text-emerald-600 font-bold text-lg">{project.finalCost}</div></div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-gray-400 text-xs font-bold uppercase mb-1">Procurement</div><div className="text-gray-900 font-bold text-xs truncate">{project.procurementMethod}</div></div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-gray-400 text-xs font-bold uppercase mb-1">Client</div><div className="text-gray-900 font-bold text-xs truncate">{project.client}</div></div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-gray-400 text-xs font-bold uppercase mb-1">Location</div><div className="text-gray-900 font-bold text-sm truncate">{project.locationCity}</div></div>
            </div>
            <div className="mb-8"><h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><Info className="w-5 h-5 text-primary-500" /> Executive Summary</h4><p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line border-l-4 border-primary-200 pl-4">{project.description}</p></div>
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><h5 className="flex items-center gap-2 font-bold text-gray-800 mb-4"><TrendingUp className="w-4 h-4 text-emerald-500" /> Budget</h5><div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Initial</span><span className="font-medium">{project.initialCost}</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Final</span><span className="font-bold text-emerald-600">{project.finalCost}</span></div></div>
                 <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><h5 className="flex items-center gap-2 font-bold text-gray-800 mb-4"><Clock className="w-4 h-4 text-blue-500" /> Schedule</h5><div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Planned</span><span className="font-medium">{project.dates.contractedCompletion || 'N/A'}</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Actual</span><span className="font-bold text-blue-600">{project.dates.actualCompletion || 'N/A'}</span></div></div>
            </div>
            <div className="mb-8"><h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary-500" /> Team</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Object.entries(project.team).map(([role, name]) => name && (<div key={role} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"><div className="w-2 h-2 rounded-full bg-primary-400" /><div><div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{role.replace(/([A-Z])/g, ' $1').trim()}</div><div className="text-sm font-semibold text-gray-900 line-clamp-1">{name}</div></div></div>))}</div></div>
            {project.qa && Object.keys(project.qa).length > 0 && (<div className="mb-8"><h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary-500" /> Insights</h4><div className="space-y-3">{Object.entries(project.qa).map(([question, answer], idx) => (<div key={idx} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100"><p className="text-xs font-bold text-indigo-400 uppercase mb-1">{question}</p><p className="text-sm font-medium text-gray-800">{answer}</p></div>))}</div></div>)}
            {project.profileUrl && (<div className="flex justify-center pb-8"><a href={project.profileUrl} target="_blank" rel="noopener noreferrer"><Button size="lg" className="bg-primary-600 hover:bg-primary-700 text-white px-10 shadow-lg">View Official DBIA Source <ExternalLink className="ml-2 w-4 h-4" /></Button></a></div>)}
        </div>
    </motion.div>
)

const ExpandedExpertCard = ({ expert, onClose }: { expert: Expert, onClose: () => void }) => (
    <motion.div layoutId={`expert-card-${expert.id}`} className="bg-white w-full max-w-5xl h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        <div className="w-full md:w-80 bg-gray-50 p-8 border-r border-gray-100 overflow-y-auto shrink-0">
            <div className="flex flex-col items-center text-center mb-8">
                <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden border-4 border-white shadow-md"><img src={expert.image} className="w-full h-full object-cover"/></div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{expert.name}</h2>
                <p className="text-primary-600 font-medium mb-4">{expert.firm}</p>
                
                {/* ⬇️ CONTACT & ACTION ICONS */}
                <div className="flex gap-3 justify-center mb-6 flex-wrap">
                    <a href={`mailto:${expert.email}`} title="Email" className="p-3 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm transition-all"><Mail className="w-5 h-5" /></a>
                    <a href={`tel:${expert.phone}`} title="Call" className="p-3 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm transition-all"><Phone className="w-5 h-5" /></a>
                    <a href={expert.website} target="_blank" title="Website" className="p-3 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm transition-all"><Globe className="w-5 h-5" /></a>
                    {/* 📅 CALENDLY */}
                    <a href={expert.calendlyUrl} target="_blank" title="Book Consultation" className="p-3 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm transition-all"><Calendar className="w-5 h-5" /></a>
                    {/* 💳 PAYMENT */}
                    <a href={expert.paymentUrl} target="_blank" title="Make Payment" className="p-3 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 hover:shadow-sm transition-all"><CreditCard className="w-5 h-5" /></a>
                </div>

                <div className="w-full space-y-3 text-left">
                     <div className="bg-white p-3 rounded-xl border border-gray-100"><div className="text-xs text-gray-400 uppercase font-bold mb-1">Location</div><div className="text-sm font-semibold text-gray-800 flex items-center gap-2"><MapPin className="w-3 h-3 text-primary-500"/> {expert.location}</div></div>
                     <div className="bg-white p-3 rounded-xl border border-gray-100"><div className="text-xs text-gray-400 uppercase font-bold mb-1">Experience</div><div className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Clock className="w-3 h-3 text-primary-500"/> {expert.yearsExperience} Years</div></div>
                </div>
            </div>
            <div className="mb-6"><h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-primary-500"/> Credentials</h4><div className="space-y-2">{expert.credentials.map((cred, i) => (<div key={i} className="text-xs bg-white p-2 rounded-lg border border-gray-200"><div className="font-semibold text-gray-800">{cred.name}</div><div className="text-gray-400 mt-0.5">{cred.issuer}</div></div>))}</div></div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 text-slate-800 bg-white">
            <div className="mb-8"><h3 className="text-xl font-bold text-gray-900 mb-4">About</h3><p className="text-gray-600 leading-relaxed text-sm">{expert.description}</p></div>
            <div className="mb-8"><h3 className="text-xl font-bold text-gray-900 mb-4">Areas of Expertise</h3><div className="flex flex-wrap gap-2">{expert.expertise.map(skill => (<Badge key={skill} className="bg-orange-50 text-orange-700 border-orange-100 px-3 py-1">{skill}</Badge>))}</div></div>
            <div className="mb-8"><h3 className="text-xl font-bold text-gray-900 mb-4">Recent Projects</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{expert.projects.map((proj, i) => (<div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between"><div><div className="font-bold text-gray-900 text-sm">{proj.name}</div><div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {proj.location}</div></div></div>))}</div></div>
            <div className="mb-8"><h3 className="text-xl font-bold text-gray-900 mb-4">Reviews</h3><div className="space-y-4">{expert.reviews.map((rev, i) => (<div key={i} className="bg-white border-b border-gray-100 pb-4 last:border-0"><div className="flex justify-between items-center mb-2"><div className="font-bold text-sm text-gray-900">{rev.reviewer}</div><div className="flex gap-1">{[...Array(5)].map((_, starI) => (<Star key={starI} className={`w-3 h-3 ${starI < rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />))}</div></div><p className="text-sm text-gray-600 italic">"{rev.comment}"</p></div>))}</div></div>
        </div>
    </motion.div>
)

export default Marketplace