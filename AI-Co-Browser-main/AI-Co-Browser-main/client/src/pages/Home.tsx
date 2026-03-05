import { motion } from "framer-motion";
import { ArrowRight, Github, Linkedin, Mail, Twitter, ExternalLink, Code2, Server, Wrench } from "lucide-react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Section, SectionHeader } from "@/components/ui/section";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatWidget } from "@/components/ChatWidget";

export default function Home() {
  const { data, isLoading } = usePortfolio();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  const { projects = [], skills = [], experience = [] } = data || {};

  return (
    <div className="bg-background min-h-screen relative overflow-x-hidden selection:bg-primary/30">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-30" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen opacity-30" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="text-xl font-bold font-display tracking-tight">dev.portfolio</span>
            <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
              {['About', 'Skills', 'Experience', 'Projects', 'Contact'].map((item) => (
                <a 
                  key={item} 
                  href={`#${item.toLowerCase()}`}
                  className="hover:text-primary transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="home" className="min-h-screen flex items-center pt-16">
          <div className="max-w-7xl mx-auto px-4 md:px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Available for hire
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
                Building <span className="text-gradient">digital experiences</span> that matter.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
                I'm a full-stack developer passionate about creating beautiful, functional, and user-centered digital products.
              </p>
              <div className="flex gap-4">
                <a 
                  href="#projects" 
                  className="px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25 flex items-center gap-2"
                >
                  View Work <ArrowRight className="w-4 h-4" />
                </a>
                <a 
                  href="#contact" 
                  className="px-8 py-4 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/80 transition-all border border-white/5"
                >
                  Contact Me
                </a>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden md:block"
            >
              {/* Abstract decorative elements */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" />
              <div className="relative z-10 grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-12">
                  <div className="p-6 bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
                    <Code2 className="w-8 h-8 text-primary mb-4" />
                    <h3 className="font-bold text-lg mb-1">Clean Code</h3>
                    <p className="text-sm text-muted-foreground">Maintainable and scalable architecture</p>
                  </div>
                  <div className="p-6 bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
                    <Wrench className="w-8 h-8 text-pink-500 mb-4" />
                    <h3 className="font-bold text-lg mb-1">Modern Tools</h3>
                    <p className="text-sm text-muted-foreground">Latest tech stack integration</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-6 bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
                    <Server className="w-8 h-8 text-purple-500 mb-4" />
                    <h3 className="font-bold text-lg mb-1">Robust Backend</h3>
                    <p className="text-sm text-muted-foreground">Secure and efficient API design</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* About Section */}
        <Section id="about" className="bg-secondary/30">
          <SectionHeader 
            title="About Me" 
            subtitle="I bridge the gap between design and engineering, crafting interfaces that not only look good but feel natural to use."
          />
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
              {/* Unsplash image for profile/workspace context */}
              {/* Minimalist modern workspace setup */}
              <img 
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80" 
                alt="Workspace" 
                className="relative rounded-2xl w-full h-[400px] object-cover shadow-2xl"
              />
            </div>
            <div className="space-y-6 text-lg text-muted-foreground">
              <p>
                With over 5 years of experience in full-stack development, I've had the privilege of working with startups and established companies to build scalable solutions.
              </p>
              <p>
                My approach is user-first. I believe that the best code is the kind that disappears, leaving the user with a seamless experience. When I'm not coding, you can find me exploring new technologies, contributing to open source, or brewing the perfect cup of coffee.
              </p>
              <div className="pt-4 grid grid-cols-2 gap-4">
                {[
                  { label: "Years Experience", value: "5+" },
                  { label: "Projects Completed", value: "50+" },
                  { label: "Happy Clients", value: "30+" },
                  { label: "Coffee Consumed", value: "∞" }
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="text-3xl font-bold text-white font-display">{stat.value}</div>
                    <div className="text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Skills Section */}
        <Section id="skills">
          <SectionHeader title="Technical Skills" subtitle="My constantly evolving toolkit." />
          <div className="grid md:grid-cols-3 gap-8">
            {skills.map((skillGroup: any) => (
              <Card key={skillGroup.id} className="bg-card/40 border-white/5 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-primary">{skillGroup.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skillGroup.items.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        {/* Experience Section */}
        <Section id="experience" className="bg-secondary/30">
          <SectionHeader title="Work Experience" subtitle="My professional journey." />
          <div className="max-w-3xl mx-auto space-y-8">
            {experience.map((job: any, index: number) => (
              <div key={job.id} className="relative pl-8 md:pl-0">
                {/* Timeline line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10 md:left-1/2 md:-ml-px" />
                
                <div className={`md:flex items-center justify-between gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="hidden md:block w-5/12" />
                  
                  <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-primary md:left-1/2 md:-ml-1" />
                  
                  <div className="w-full md:w-5/12 mb-8 md:mb-0">
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg">{job.role}</CardTitle>
                          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                            {job.period}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white/80">{job.company}</div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {job.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Projects Section */}
        <Section id="projects">
          <SectionHeader title="Featured Projects" subtitle="A selection of my recent work." />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project: any) => (
              <Card key={project.id} className="group overflow-hidden flex flex-col h-full hover:-translate-y-2 transition-transform duration-300">
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors z-10" />
                  {/* Fallback pattern if image fails */}
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    {project.imageUrl ? (
                      <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <Code2 className="w-12 h-12 text-white/20" />
                    )}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {project.techStack.map((tech: string) => (
                      <Badge key={tech} variant="outline" className="text-xs border-white/10">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                {project.link && (
                  <CardFooter className="pt-0 border-t border-white/5 mt-auto">
                    <a 
                      href={project.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                    >
                      View Project <ExternalLink className="w-4 h-4" />
                    </a>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </Section>

        {/* Contact Section */}
        <Section id="contact" className="bg-gradient-to-t from-black to-secondary/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6">Let's work together.</h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Have a project in mind or just want to say hi? I'm always open to discussing new opportunities.
            </p>
            
            <Card className="max-w-md mx-auto bg-card/80 backdrop-blur-xl border-white/10 p-2">
              <form className="space-y-4 p-4 text-left">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <input className="w-full bg-secondary/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input className="w-full bg-secondary/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea rows={4} className="w-full bg-secondary/50 border border-white/10 rounded-lg p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Tell me about your project..." />
                </div>
                <button className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  Send Message
                </button>
              </form>
            </Card>

            <div className="flex justify-center gap-6 mt-12">
              {[
                { icon: Github, href: "https://github.com" },
                { icon: Linkedin, href: "https://linkedin.com" },
                { icon: Twitter, href: "https://twitter.com" },
                { icon: Mail, href: "mailto:hello@example.com" }
              ].map((Social, i) => (
                <a 
                  key={i}
                  href={Social.href}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 hover:text-primary transition-all hover:-translate-y-1"
                >
                  <Social.icon className="w-6 h-6" />
                </a>
              ))}
            </div>
          </div>
        </Section>
        
        <footer className="py-8 text-center text-muted-foreground text-sm border-t border-white/5">
          <p>© 2024 Portfolio. Built with React, Tailwind & AI.</p>
        </footer>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </div>
  );
}
