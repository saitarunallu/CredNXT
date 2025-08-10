import { Shield, Zap, Database, Lock } from "lucide-react";

export default function TechnologySection() {
  const techStacks = [
    {
      category: "Frontend",
      description: "Next.js PWA with responsive design",
      technologies: ["Next.js", "PWA", "TypeScript"]
    },
    {
      category: "Backend",
      description: "Node.js with NestJS framework",
      technologies: ["Node.js", "NestJS", "TypeScript"]
    },
    {
      category: "Database",
      description: "PostgreSQL with Redis for queuing",
      technologies: ["PostgreSQL", "Redis", "BullMQ"]
    },
    {
      category: "Authentication",
      description: "OTP-based with JWT sessions",
      technologies: ["Twilio", "JWT", "OTP"]
    },
    {
      category: "Storage & CDN",
      description: "S3-compatible with MinIO/AWS",
      technologies: ["AWS S3", "MinIO", "CDN"]
    },
    {
      category: "Deployment",
      description: "Docker containerization",
      technologies: ["Docker", "Compose", "Cloud Ready"]
    }
  ];

  const securityFeatures = [
    {
      icon: Shield,
      title: "SSL Encryption",
      description: "End-to-end data protection"
    },
    {
      icon: Lock,
      title: "Data Privacy",
      description: "GDPR compliant architecture"
    },
    {
      icon: Database,
      title: "Legal Contracts",
      description: "Enforceable digital agreements"
    },
    {
      icon: Zap,
      title: "99.9% Uptime",
      description: "Reliable infrastructure"
    }
  ];

  return (
    <section id="technology" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">
            Built with Modern Technology
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Enterprise-grade architecture ensuring security, scalability, and reliability
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {techStacks.map((stack, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{stack.category}</h3>
              <p className="text-gray-600 text-sm mb-4">{stack.description}</p>
              <div className="flex flex-wrap gap-2">
                {stack.technologies.map((tech, techIndex) => (
                  <span 
                    key={techIndex}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Security & Compliance</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
