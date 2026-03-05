import type { Project, Skill, Experience, Message } from "@shared/schema";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getSkills(): Promise<Skill[]>;
  getExperience(): Promise<Experience[]>;

  // Chat
  getMessages(sessionId: string): Promise<Message[]>;
  createMessage(role: string, content: string, sessionId: string): Promise<Message>;

  // Seed
  seed(): Promise<void>;
}

export class InMemoryStorage implements IStorage {
  private projects: Project[] = [];
  private skills: Skill[] = [];
  private experience: Experience[] = [];
  private messages: Message[] = [];
  private nextId = 1;

  async getProjects(): Promise<Project[]> {
    return this.projects;
  }

  async getSkills(): Promise<Skill[]> {
    return this.skills;
  }

  async getExperience(): Promise<Experience[]> {
    return this.experience;
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.messages.filter(m => m.sessionId === sessionId).slice(-20);
  }

  async createMessage(role: string, content: string, sessionId: string): Promise<Message> {
    const msg: Message = { id: this.nextId++, role, content, sessionId };
    this.messages.push(msg);
    return msg;
  }

  async seed(): Promise<void> {
    if (this.projects.length > 0) return;

    this.projects = [
      {
        id: 1,
        title: "AI Portfolio Assistant",
        description: "A co-browsing chatbot that helps visitors navigate this portfolio.",
        techStack: ["React", "TypeScript", "OpenAI", "Tailwind"],
        link: "#",
        imageUrl: "https://images.unsplash.com/photo-1531297461136-8208631433e7?w=800&q=80"
      },
      {
        id: 2,
        title: "E-Commerce Dashboard",
        description: "Real-time analytics dashboard for online retailers.",
        techStack: ["Vue.js", "D3.js", "Node.js"],
        link: "#",
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
      },
      {
        id: 3,
        title: "Social Media App",
        description: "Connect and share moments with friends.",
        techStack: ["React Native", "Firebase", "Redux"],
        link: "#",
        imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80"
      }
    ];

    this.skills = [
      { id: 1, category: "Frontend", items: ["React", "TypeScript", "Tailwind CSS", "Framer Motion"] },
      { id: 2, category: "Backend", items: ["Node.js", "Express", "PostgreSQL", "Python"] },
      { id: 3, category: "AI/ML", items: ["OpenAI API", "TensorFlow", "LangChain"] }
    ];

    this.experience = [
      {
        id: 1,
        role: "Senior Full Stack Developer",
        company: "Tech Corp",
        period: "2023 - Present",
        description: "Leading a team of 5 developers building cloud-native applications."
      },
      {
        id: 2,
        role: "Software Engineer",
        company: "StartUp Inc",
        period: "2021 - 2023",
        description: "Developed and maintained multiple React-based web applications."
      }
    ];
  }
}

export const storage = new InMemoryStorage();
