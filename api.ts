const BASE_URL = "http://localhost:5001"; 

export interface Vendor {
  id: string
  name: string
  location: string
  specialties: string[]
  rating: number
  description: string
  image: string
  verified: boolean
  rank: number
  statistics: { [key: string]: number }
  prominent_projects: { project: string; url: string | null; image_url: string | null; image_file_id: string | null }[]
}

export interface Project {
  id: string;
  source: string;
  profileUrl: string;
  title: string;
  locationState: string;
  firmName: string;
  procurementMethod: string;
  contractFormat: string;
  completedDate: string;
  finalCost: string;
  category: string;
  locationCity: string;
  client: string;
  description: string;
  team: {
    designBuilder?: string;
    architect?: string;
    engineer?: string;
    generalContractor?: string;
    ownerAdvisor?: string;
  };
  dates: {
    contractedStart?: string;
    actualStart?: string;
    contractedCompletion?: string;
    actualCompletion?: string;
  };
  initialCost: string;
  qa: { [key: string]: string };
  imageUrl: string;
  matchScore?: number;
}

export interface Expert {
  id: string;
  name: string;
  firm: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  calendlyUrl?: string; 
  paymentUrl?: string;
  expertise: string[];
  yearsExperience: number;
  rating: number;
  activeProjects: number;
  description: string;
  projects: { name: string; location: string }[];
  teams: { name: string; members: { name: string; role: string }[] }[];
  reviews: { reviewer: string; rating: number; date: string; comment: string }[];
  credentials: { name: string; issuer: string; id: string; validThrough: string }[];
  image: string;
  matchScore?: number;
}

// --- HELPER MAPPERS ---

const mapExperts = (data: any[]): Expert[] => {
    if (!Array.isArray(data)) return []; // 🛡️ CRASH PREVENTION
    return data.map((item: any) => ({
      id: item.expertId || item._id || Math.random().toString(),
      name: item.name || "Unknown Expert",
      firm: item.constructionFirm || "Independent",
      location: item.location ? (typeof item.location === 'string' ? item.location : `${item.location.city}, ${item.location.state}`) : "Unknown",
      email: item.email || "",
      phone: item.phone || "",
      website: item.website || "",
      calendlyUrl: item.calendlyUrl || "https://calendly.com/", 
      paymentUrl: item.paymentUrl || "https://stripe.com/",
      expertise: item.expertiseIn || [],
      yearsExperience: item.yearsOfService || 0,
      rating: item.rating || 5.0,
      activeProjects: item.activeProjects || 0,
      description: item.overview || "No description available.",
      projects: (item.projects || []).map((p: any) => ({ name: p.projectName, location: p.location })),
      teams: [], 
      reviews: (item.reviews || []).map((r: any) => ({ reviewer: r.reviewerName, rating: r.rating, date: r.date, comment: r.comment })),
      credentials: (item.credentials || []).map((c: any) => ({ name: c.credentialName, issuer: c.issuer, id: c.id, validThrough: c.validThrough })),
      image: "/src/assets/Image_not_available.png",
      matchScore: item.matchScore
    }));
}

const mapProjects = (data: any[]): Project[] => {
    if (!Array.isArray(data)) return []; // 🛡️ CRASH PREVENTION
    return data.map((p: any) => ({
        id: p.projectId || p._id || Math.random().toString(),
        source: "dbia",
        profileUrl: p.profileUrl || "",
        title: p.grid?.name || "Untitled Project",
        locationState: p.grid?.location || "",
        firmName: p.grid?.designBuilder || "Unknown Firm",
        procurementMethod: p.grid?.procurementMethod || "",
        contractFormat: p.grid?.contractFormat || "",
        completedDate: p.grid?.completed || "",
        finalCost: p.grid?.finalCost?.raw || "",
        category: p.details?.Category?.[0] || "General",
        locationCity: p.details?.["Project Location"] || "",
        client: p.details?.["Client/Owner"] || "",
        description: p.details?.["Short Project Description"] || "",
        team: {
            designBuilder: p.details?.["Design-Build Team"]?.["Design-Build Firm"],
            architect: p.details?.["Design-Build Team"]?.["Architect"]
        },
        dates: {},
        initialCost: p.details?.["Initial Contracted Project Cost"] || "",
        qa: p.details?.["Q&A"] || {},
        imageUrl: "/src/assets/Image_not_available.png",
        matchScore: p.matchScore
    }));
}

// --- SAFE API FUNCTIONS ---

export const getVendors = async (): Promise<Vendor[]> => {
  try {
    const res = await fetch(`${BASE_URL}/api/architect-firms`);
    if (!res.ok) return [];
    const data = await res.json();
    
    if (!Array.isArray(data)) return []; // 🛡️ CRASH PREVENTION

    return data.map((f: any) => ({
        id: f._id || Math.random().toString(),
        name: f.name || "Unknown Firm",
        description: f.introduction || f.name,
        location: "Global", 
        rating: 4.8,
        rank: f.rank || 0,
        image: '/src/assets/image_not_available.png',
        specialties: [],
        verified: true,
        statistics: f.statistics || {},
        prominent_projects: f.prominent_projects || []
    }));
  } catch (error) { return []; }
};

export const getProjects = async (): Promise<Project[]> => {
  try {
    const res = await fetch(`${BASE_URL}/api/projects`);
    if (!res.ok) return [];
    const data = await res.json();
    return mapProjects(data);
  } catch (error) { return []; }
}

export const getExperts = async (): Promise<Expert[]> => {
  try {
    const res = await fetch(`${BASE_URL}/api/experts`); 
    if (!res.ok) return [];
    const data = await res.json();
    return mapExperts(data);
  } catch (error) { return []; }
}

export const searchExpertsAI = async (query: string): Promise<Expert[]> => {
  try {
    const res = await fetch(`${BASE_URL}/api/ai-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return mapExperts(data);
  } catch (error) { return []; }
};

export const searchProjectsAI = async (query: string): Promise<Project[]> => {
  try {
    const res = await fetch(`${BASE_URL}/api/ai-search-projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return mapProjects(data);
  } catch (error) { return []; }
};

// Add this to your existing API exports
export const searchFirmsAI = async (query: string) => {
    try {
        const response = await fetch('http://localhost:5001/api/ai-search-firms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
};