// Vercel Serverless Function: GET /api/portfolio
// Fully self-contained — no cross-file imports (Vercel bundles each function independently)
import type { VercelRequest, VercelResponse } from "@vercel/node";

const projects = [
  {
    id: 1,
    title: "AI Portfolio Assistant",
    description: "A co-browsing chatbot that helps visitors navigate this portfolio.",
    techStack: ["React", "TypeScript", "OpenAI", "Tailwind"],
    link: "#",
    imageUrl: "https://images.unsplash.com/photo-1531297461136-8208631433e7?w=800&q=80",
  },
  {
    id: 2,
    title: "E-Commerce Dashboard",
    description: "Real-time analytics dashboard for online retailers.",
    techStack: ["Vue.js", "D3.js", "Node.js"],
    link: "#",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  },
  {
    id: 3,
    title: "Social Media App",
    description: "Connect and share moments with friends.",
    techStack: ["React Native", "Firebase", "Redux"],
    link: "#",
    imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
  },
];

const skills = [
  { id: 1, category: "Frontend", items: ["React", "TypeScript", "Tailwind CSS", "Framer Motion"] },
  { id: 2, category: "Backend", items: ["Node.js", "Express", "PostgreSQL", "Python"] },
  { id: 3, category: "AI/ML", items: ["OpenAI API", "TensorFlow", "LangChain"] },
];

const experience = [
  {
    id: 1,
    role: "Senior Full Stack Developer",
    company: "Tech Corp",
    period: "2023 - Present",
    description: "Leading a team of 5 developers building cloud-native applications.",
  },
  {
    id: 2,
    role: "Software Engineer",
    company: "StartUp Inc",
    period: "2021 - 2023",
    description: "Developed and maintained multiple React-based web applications.",
  },
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    return res.status(200).json({ projects, skills, experience });
  } catch (err: any) {
    console.error("Portfolio API error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
}
