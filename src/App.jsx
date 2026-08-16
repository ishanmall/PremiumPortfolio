import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { ArrowUpRight, Code2, Play, Briefcase, Camera, Tv, ExternalLink, Award, GraduationCap, BookOpen, Smartphone, ShieldCheck } from 'lucide-react';

// --- COMPONENTS --- //

// Lightweight cursor: RAF-throttled, no blur / no mix-blend 
const CustomCursor = () => {
  const cursorRef = useRef(null);
  const frame = useRef(null);

  useEffect(() => {
    const moveCursor = (e) => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate3d(${e.clientX - 8}px, ${e.clientY - 8}px, 0)`;
        }
      });
    };
    window.addEventListener('mousemove', moveCursor, { passive: true });
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-4 h-4 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full pointer-events-none z-[100] hidden md:block"
      style={{ transform: 'translate3d(-100px, -100px, 0)' }}
    />
  );
};

// Clean, lightweight ambient background
const AmbientBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#050511] overflow-hidden">
      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.15; }
          50% { transform: scale(1.15) rotate(90deg); opacity: 0.3; }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.08; }
          50% { transform: scale(1.3) rotate(-90deg); opacity: 0.22; }
        }
        .bg-orb-1 { animation: orbFloat1 20s ease-in-out infinite; will-change: transform, opacity; }
        .bg-orb-2 { animation: orbFloat2 25s ease-in-out infinite; will-change: transform, opacity; }
      `}</style>

      {/* Dark Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050511]/60 via-[#050511]/30 to-[#050511]/90 z-[1]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#050511]/50 to-[#050511] z-[1]"></div>

      {/* Ambient glow orbs — CSS-driven, highly optimized */}
      <div className="bg-orb-1 absolute -top-[20%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-fuchsia-600/30 blur-[70px] z-[2]" />
      <div className="bg-orb-2 absolute top-[40%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-cyan-600/30 blur-[70px] z-[2]" />
    </div>
  );
};

const Nav = () => (
  <motion.nav 
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    className="fixed top-0 left-0 right-0 z-50 p-6 md:p-10 flex justify-between items-center bg-[#050511]/40 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/50"
  >
    <div className="font-display font-bold text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:scale-105 transition-transform cursor-pointer">
      ISHAN.
    </div>
    <ul className="flex gap-6 md:gap-8 text-sm font-medium text-slate-200">
      {['About', 'Experience', 'Contact'].map((item) => (
        <li key={item} className="hidden md:block">
          <a href={`#${item.toLowerCase()}`} className="relative group overflow-hidden block hover:text-cyan-400 transition-colors">
            <span className="block transition-transform duration-500 ease-[0.76,0,0.24,1] group-hover:-translate-y-full">{item}</span>
            <span className="block absolute top-0 left-0 transition-transform duration-500 ease-[0.76,0,0.24,1] translate-y-full group-hover:translate-y-0 text-cyan-400">{item}</span>
          </a>
        </li>
      ))}
    </ul>
  </motion.nav>
);

const Hero = () => {
  return (
    <section className="h-screen flex flex-col justify-end p-6 md:p-10 pb-20 relative perspective-[1200px]">
      <div className="w-full max-w-7xl mx-auto z-10 transform-style-3d">
        <div className="overflow-hidden mb-6">
          <motion.div 
            initial={{ y: "100%", opacity: 0, rotateX: -20 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
            className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-cyan-500/20 hover:bg-white/10 transition-colors cursor-default"
          >
            <span className="text-cyan-400 text-sm font-bold uppercase tracking-widest">Android Developer</span>
            <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]"></span>
            <span className="hidden md:block text-slate-300 text-sm uppercase tracking-widest">Independent Developer</span>
          </motion.div>
        </div>
        
        <h1 className="font-display text-[11vw] md:text-[9vw] leading-[0.85] tracking-tighter uppercase font-bold text-white drop-shadow-2xl flex flex-col">
          <motion.div
             initial={{ rotateX: 60, opacity: 0, y: 80, z: -100 }}
             animate={{ rotateX: 0, opacity: 1, y: 0, z: 0 }}
             transition={{ duration: 1.2, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
             className="origin-bottom"
          >
            ENGINEERING
          </motion.div>
          <motion.div
             initial={{ rotateX: 60, opacity: 0, y: 80, z: -100 }}
             animate={{ rotateX: 0, opacity: 1, y: 0, z: 0 }}
             transition={{ duration: 1.2, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
             className="origin-bottom text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 py-2"
          >
            NATIVE ANDROID
          </motion.div>
          <motion.div
             initial={{ rotateX: 60, opacity: 0, y: 80, z: -100 }}
             animate={{ rotateX: 0, opacity: 1, y: 0, z: 0 }}
             transition={{ duration: 1.2, delay: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
             className="origin-bottom"
          >
            EXPERIENCES.
          </motion.div>
        </h1>
      </div>
    </section>
  );
};

const About = () => {
  return (
    <section id="about" className="py-24 px-6 md:px-10 relative z-10">
      {/* Restored 3D Profile Card with your exact image */}
      <div className="max-w-7xl mx-auto flex justify-center perspective-[1200px]">
        <motion.div 
          initial={{ rotateY: 15, opacity: 0, y: 50 }}
          whileInView={{ rotateY: 0, opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          whileHover={{ scale: 1.05, rotateY: 15, rotateX: 5, z: 50 }}
          className="max-w-sm w-full rounded-3xl overflow-hidden border border-white/20 shadow-[0_0_40px_rgba(6,182,212,0.3)] bg-[#111] p-2 transform-style-3d"
        >
           <div className="rounded-2xl overflow-hidden aspect-[3/4] relative">
            <img 
              src="/isha.ndisha_1785611777_3954320607764516452_77465641188.webp" 
              alt="Ishan Mall" 
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 p-6 w-full transform translate-z-10">
              <h3 className="text-2xl font-display font-bold text-white mb-2 drop-shadow-md">Ishan Mall</h3>
              <div className="space-y-2">
                <p className="text-slate-300 text-xs flex items-center gap-2"><GraduationCap size={14} className="text-cyan-400"/> B.Tech CSE (2024-2027), AKTU</p>
                <p className="text-slate-300 text-xs flex items-center gap-2"><Award size={14} className="text-fuchsia-400"/> Class XII Science (62.40%)</p>
                <p className="text-slate-300 text-xs flex items-center gap-2"><BookOpen size={14} className="text-blue-400"/> Class X (79.67%)</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const ExperienceAndSkills = () => {
  const technicalSkills = {
    "Programming": ["Kotlin", "Java"],
    "Android Core": ["Android SDK", "Jetpack Compose", "Material Design", "MVVM", "Room", "Hilt", "Coroutines"],
    "Media & Storage": ["MediaStore", "Storage Access Framework", "Media3", "ExoPlayer", "Audio/Video Playback", "Video Editing"],
    "Tools & Backend": ["Firebase", "Android Studio", "Git & GitHub", "GitLab", "Gradle", "Google Play Console", "JSON"],
    "Other": ["Prompt Engineering", "AI Image Generation", "AI Video Generation"]
  };

  const certifications = [
    {
      title: "NASA ARSET — Fundamentals of Remote Sensing",
      date: "August 2026",
      org: "NASA",
      color: "from-blue-500 to-cyan-400",
      verify: {
        url: "https://arset.unhosting.site/admin/tool/certificate/",
        tokens: [{ label: "Token", value: "9282872552IM" }]
      }
    },
    {
      title: "NASA ARSET — Hyperspectral Data for Land and Coastal Systems",
      date: "August 2026",
      org: "NASA",
      color: "from-blue-500 to-cyan-400",
      verify: {
        url: "https://arset.unhosting.site/admin/tool/certificate/",
        tokens: [{ label: "Token", value: "8087690127IM" }]
      }
    },
    {
      title: "NASA ARSET — Developing Sustainable Earth Science Applications (Mod 1, 2, 3)",
      date: "August 2026",
      org: "NASA",
      color: "from-blue-500 to-cyan-400",
      verify: {
        url: "https://arset.unhosting.site/admin/tool/certificate/",
        tokens: [
          { label: "Module 1", value: "8244447708IM" },
          { label: "Module 2", value: "7479263264IM" },
          { label: "Module 3", value: "4903623744IM" }
        ]
      }
    },
    {
      title: "Earth Observations & Numerical Model Apps for Tropical Cyclones",
      date: "July 2026",
      org: "ISRO / IIRS",
      color: "from-orange-500 to-rose-400",
      verify: {
        url: "https://isrolms.iirs.gov.in/mod/customcert/verify_certificate.php",
        tokens: [{ label: "Code", value: "GlXSTqDe20" }]
      }
    },
    {
      title: "Climate Change Induced Disasters",
      date: "June 2026",
      org: "ISRO / IIRS",
      color: "from-orange-500 to-rose-400",
      verify: {
        url: "https://isrolms.iirs.gov.in/mod/customcert/verify_certificate.php",
        tokens: [{ label: "Code", value: "o1XDAFZIUr" }]
      }
    },
    {
      title: "NASA Open Science 101",
      date: "June – August 2026",
      org: "NASA",
      color: "from-blue-500 to-cyan-400",
      verify: {
        url: "https://www.credly.com/badges/70d53e1e-9739-465f-b71a-544dcc7ab329/public_url"
      }
    },
    {
      title: "Operating Systems Basics",
      date: "August 2026",
      org: "Cisco Networking Academy",
      color: "from-emerald-500 to-teal-400",
      verify: {
        url: "https://www.credly.com/badges/747d9b22-d547-4c1b-b77e-c531f9ec8663/public_url"
      }
    },
    {
      title: "YUVA AI for ALL",
      date: "Feb – Mar 2026",
      org: "NASSCOM FutureSkills Prime",
      color: "from-violet-500 to-purple-400",
      verify: {
        url: "https://www.futureskillsprime.in/iDH/user/credential/view/32914-029623ab-0348-11f1-bdec-005056b48b54/certificate"
      }
    },
    { 
      title: "YUVA Artificial Intelligence (AI)", 
      date: "Jan – Feb 2026", 
      org: "TCS", 
      color: "from-violet-500 to-purple-400",
      verify: {
        url: "https://g09.tcsion.com:443//LX/ecertificate/verification?id=24756114-7212-84272-1"
      }
    },
    {
      title: "Android App Development with AI",
      date: "Jul – Sep 2025",
      org: "Internshala Trainings",
      color: "from-emerald-500 to-teal-400",
      verify: {
        url: "https://admin.skillindiadigital.gov.in/documentverificationbyQR?content=P0NhbmRpZGF0ZSBOYW1lID0gSVNIQU4gTUFMTCYmQ2FuZGlkYXRlIElkID0gQ0FOXzM4MDE5ODA0JiZUUCBJZCA9IFRQMTY3NjIxJiZUQyBOYW1lID0gSU5URVJOU0hBTEEgVFJBSU5JTkdTJiZCYXRjaElkID0gMzQxOTE5MyYmRG9jdW1lbnQgSUQgPSBTVEhSMkpIMUk0VVpZTVBVJiZUQyBBZGRyZXNzID0gQi02MTAmJlVOSVRFQ0ggQlVTSU5FU1MgWk9ORSYmU09VVEggQ0lUWSBJSSYmU0VDLTUwLTEyMjAxOC4mJkRvY3VtZW50ID0gY2VydGlmaWNhdGUmJklzc3VhbmNlIERhdGUgPSAxNS8wOS8yMDI1",
        tokens: [{ label: "Document ID", value: "STHR2JH1I4UZYMPU" }]
      }
    },
    {
      title: "Android App Development",
      date: "Jul – Sep 2025",
      org: "Skill India / NSDC",
      color: "from-emerald-500 to-teal-400",
      verify: {
        url: "https://admin.skillindiadigital.gov.in/documentverificationbyQR?content=P0NhbmRpZGF0ZSBOYW1lID0gSVNIQU4gTUFMTCYmQ2FuZGlkYXRlIElkID0gQ0FOXzM4MDE5ODA0JiZUUCBJZCA9IFRQMTY3NjIxJiZUQyBOYW1lID0gSU5URVJOU0hBTEEgVFJBSU5JTkdTJiZCYXRjaElkID0gMzQxOTE5MyYmRG9jdW1lbnQgSUQgPSBTVEhSMkpIMUk0VVpZTVBVJiZUQyBBZGRyZXNzID0gQi02MTAmJlVOSVRFQ0ggQlVTSU5FU1MgWk9ORSYmU09VVEggQ0lUWSBJSSYmU0VDLTUwLTEyMjAxOC4mJkRvY3VtZW50ID0gY2VydGlmaWNhdGUmJklzc3VhbmNlIERhdGUgPSAxNS8wOS8yMDI1",
        tokens: [{ label: "Document ID", value: "STHR2JH1I4UZYMPU" }]
      }
    },
  ];

  return (
    <section id="experience" className="py-24 px-6 md:px-10 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="inline-block px-4 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-16 text-cyan-400 text-xs uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]"
        >
         Experience & Technical Training
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.01 }}
              className="mb-12 p-8 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-2xl backdrop-blur-md"
            >
              <h3 className="text-3xl font-display font-bold text-white mb-2">Android Developer</h3>
              <p className="text-fuchsia-400 text-sm font-mono mb-6 bg-fuchsia-400/10 inline-block px-3 py-1 rounded-full">Independent Developer • Aug 2025 – Present</p>
              <ul className="space-y-4 text-slate-300 text-sm">
                <li className="flex items-start gap-3"><span className="text-cyan-400 mt-1">✦</span> Android application development using Kotlin.</li>
                <li className="flex items-start gap-3"><span className="text-cyan-400 mt-1">✦</span> Jetpack Compose and Material Design UI development.</li>
                <li className="flex items-start gap-3"><span className="text-cyan-400 mt-1">✦</span> MVVM-based application architecture.</li>
                <li className="flex items-start gap-3"><span className="text-cyan-400 mt-1">✦</span> Room database integration & MediaStore local media management.</li>
                <li className="flex items-start gap-3"><span className="text-cyan-400 mt-1">✦</span> Media playback using modern Android media technologies.</li>
                <li className="flex items-start gap-3"><span className="text-cyan-400 mt-1">✦</span> Designing & connecting multiple independent screens into a single application.</li>
                <li className="flex items-start gap-3"><span className="text-cyan-400 mt-1">✦</span> Debugging, testing, Firebase integration, and Google Play Console publishing.</li>
              </ul>
            </motion.div>

            <h4 className="text-2xl font-display font-bold text-white mb-6 drop-shadow-md">Technical Arsenal</h4>
            <div className="space-y-6">
              {Object.entries(technicalSkills).map(([category, skills]) => (
                <div key={category}>
                  <p className="text-xs uppercase text-cyan-400 mb-3 tracking-wider font-bold">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                      <motion.span 
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)", zIndex: 10 }}
                        key={skill} 
                        className="px-4 py-2 border border-white/10 rounded-xl text-xs bg-white/5 text-slate-200 shadow-lg cursor-default"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="perspective-[1200px]">
             <h4 className="text-2xl font-display font-bold text-white mb-2 drop-shadow-md">Certifications & Training</h4>
             <p className="text-slate-400 text-xs mb-6 ml-1">
               Certificates marked with a <ShieldCheck size={12} className="inline -mt-0.5 text-cyan-400"/> can be independently verified — open the official verification link and enter the token/code shown.
             </p>
             <div className="space-y-4">
                {certifications.map((cert, i) => (
                  <motion.div 
                    initial={{ rotateX: 20, opacity: 0, y: 20 }}
                    whileInView={{ rotateX: 0, opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    whileHover={{ scale: 1.03, x: 10, rotateY: -5, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    key={i} 
                    className="p-5 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm shadow-xl overflow-hidden relative group cursor-default"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${cert.color}`}></div>
                    <p className="text-slate-400 text-xs font-mono mb-2 ml-2 group-hover:text-white transition-colors">{cert.date} | <span className="text-white font-bold">{cert.org}</span></p>
                    
                    <h5 className="text-sm md:text-base font-bold text-slate-200 ml-2 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                      {cert.title}
                      {cert.verify && <ShieldCheck size={14} className="text-cyan-400 shrink-0"/>}
                    </h5>

                    {cert.verify && (
                      <div className="mt-3 ml-2 flex flex-wrap items-center gap-2 pointer-events-auto">
                        <a
                          href={cert.verify.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-200 transition-colors"
                        >
                          Verify Certificate ↗
                        </a>
                        {cert.verify.tokens && cert.verify.tokens.map(t => (
                          <span key={t.label} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-slate-400">
                            {t.label}: <span className="text-slate-200">{t.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const GalleryBoxCaseStudy = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });
  
  const yParallax = useTransform(scrollYProgress, [0, 1], [-80, 80]);

  return (
    <section id="gallerybox" className="py-24 relative z-10" ref={containerRef}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="inline-block px-4 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 mb-12 text-blue-400 text-xs uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)]"
        >
         Featured Project
        </motion.div>
      </div>

      {/* Hero Image Area - 3D Tilt */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 mb-20 perspective-[2000px]">
        <motion.div 
          initial={{ rotateX: 30, opacity: 0, scale: 0.9 }}
          whileInView={{ rotateX: 0, opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, type: "spring" }}
          whileHover={{ rotateX: 2, rotateY: -2, scale: 1.02 }}
          className="bg-slate-900 rounded-[2rem] overflow-hidden border border-white/20 shadow-[0_30px_80px_-15px_rgba(6,182,212,0.5)] relative aspect-[4/3] md:aspect-[21/9] group"
        >
          <motion.img 
            style={{ y: yParallax }}
            src="/Screenshot 2026-08-16 095045.png" 
            alt="GalleryBox App Interface"
            className="w-full h-[140%] object-cover object-center absolute -top-[20%] opacity-70 group-hover:opacity-100 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050511] via-[#050511]/40 to-transparent flex flex-col justify-end p-8 md:p-12 pointer-events-none">
            <p className="text-cyan-400 font-mono text-sm mb-3 bg-cyan-400/10 self-start px-3 py-1 rounded-full border border-cyan-400/20">Oct 2025 – Aug 2026</p>
            <h3 className="text-5xl md:text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 mb-4 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]">GalleryBox</h3>
            <p className="text-slate-200 max-w-2xl text-base md:text-lg text-balance font-medium drop-shadow-md">
              A comprehensive multimedia gallery application inspired by Samsung Gallery. Built as an independent implementation integrating photos, videos, stories, and a duo music player.
            </p>
          </div>
          <a href="https://play.google.com/store/apps/details?id=com.gallerybox" target="_blank" rel="noreferrer" className="absolute top-8 right-8 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(6,182,212,0.8)] hover:scale-110 hover:rotate-12 transition-all pointer-events-auto">
             <Play size={28} fill="currentColor" className="ml-1"/>
          </a>
        </motion.div>
      </div>

      {/* Details Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-4 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ x: 5 }} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h4 className="text-2xl font-display font-bold mb-4 text-fuchsia-400">The Development Challenge</h4>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              One of the biggest challenges of GalleryBox was not creating individual screens separately, but making many independently developed systems work together.
            </p>
            <div className="p-4 rounded-xl bg-black/40 border border-fuchsia-500/20 text-fuchsia-300 font-mono text-xs leading-loose shadow-[inset_0_0_15px_rgba(217,70,239,0.1)]">
              Gallery → Albums → Favorites → Stories → Media Management → Music → Duo Player → Radio → Video Player → Editor → Database
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} whileHover={{ x: 5 }} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h4 className="text-xl font-display font-bold mb-4 text-cyan-400">Technical Architecture</h4>
            <ul className="space-y-3 text-sm text-slate-300">
               <li className="flex flex-col"><strong className="text-white text-xs uppercase tracking-wider mb-1">Language</strong> Kotlin</li>
               <li className="flex flex-col"><strong className="text-white text-xs uppercase tracking-wider mb-1">UI</strong> Jetpack Compose, Material 3</li>
               <li className="flex flex-col"><strong className="text-white text-xs uppercase tracking-wider mb-1">Architecture</strong> MVVM, Hilt, Coroutines</li>
               <li className="flex flex-col"><strong className="text-white text-xs uppercase tracking-wider mb-1">Database</strong> Room</li>
               <li className="flex flex-col"><strong className="text-white text-xs uppercase tracking-wider mb-1">Media</strong> MediaStore, Storage Access Framework, Media3 / ExoPlayer</li>
            </ul>
          </motion.div>
        </div>

        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6 perspective-[1200px]">
           {/* 3D Feature Cards */}
           <motion.div initial={{ opacity: 0, rotateY: 20, z: -50 }} whileInView={{ opacity: 1, rotateY: 0, z: 0 }} viewport={{ once: true }} whileHover={{ scale: 1.05, rotateY: -5, rotateX: 5, z: 50 }} className="p-8 border border-white/10 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md shadow-2xl hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all">
             <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mb-6">
                <Smartphone size={24} className="text-cyan-400"/>
             </div>
             <h5 className="text-xl font-bold text-white mb-3">Core Gallery & Albums</h5>
             <p className="text-sm text-slate-400 leading-relaxed">
               Photo/video browsing, adjustable media grids, full-screen viewer, pinch-to-zoom, search, multi-selection, slideshows. Create, rename, delete, move, copy, merge, pin, hide, and reorder albums with smart categories.
             </p>
           </motion.div>
           
           <motion.div initial={{ opacity: 0, rotateY: -20, z: -50 }} whileInView={{ opacity: 1, rotateY: 0, z: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} whileHover={{ scale: 1.05, rotateY: 5, rotateX: 5, z: 50 }} className="p-8 border border-white/10 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md shadow-2xl hover:shadow-[0_0_40px_rgba(217,70,239,0.3)] transition-all">
             <div className="w-12 h-12 rounded-full bg-fuchsia-500/20 flex items-center justify-center mb-6">
                <Play size={24} className="text-fuchsia-400"/>
             </div>
             <h5 className="text-xl font-bold text-white mb-3">Stories & Video</h5>
             <p className="text-sm text-slate-400 leading-relaxed">
               Stories functionality natively connected to the gallery. Advanced video player with background playback, repeat, rotation, and 0.25× to 8× speed. Built-in editor for cropping, text, stickers, LUTs, and visual effects.
             </p>
           </motion.div>

           <motion.div initial={{ opacity: 0, rotateY: 20, z: -50 }} whileInView={{ opacity: 1, rotateY: 0, z: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} whileHover={{ scale: 1.05, rotateY: -5, rotateX: -5, z: 50 }} className="p-8 border border-white/10 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md shadow-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all">
             <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-6">
                <Tv size={24} className="text-blue-400"/>
             </div>
             <h5 className="text-xl font-bold text-white mb-3">Duo Music Player & Radio</h5>
             <p className="text-sm text-slate-400 leading-relaxed">
               Local music library management, mini/full player, queue, shuffle, equalizer, bass boost. Dedicated Duo Music Player allowing two playback experiences simultaneously, plus integrated radio functionality.
             </p>
           </motion.div>

           <motion.div initial={{ opacity: 0, rotateY: -20, z: -50 }} whileInView={{ opacity: 1, rotateY: 0, z: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, z: 50 }} className="p-8 border border-white/10 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md shadow-2xl hover:shadow-[0_0_40px_rgba(251,146,60,0.3)] transition-all">
             <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-6">
                <BookOpen size={24} className="text-orange-400"/>
             </div>
             <h5 className="text-xl font-bold text-white mb-3">Media Management</h5>
             <p className="text-sm text-slate-400 leading-relaxed">
               Favorites, hidden media, trash/restore with 30-day lifecycle, duplicate detection, local media synchronization, and real-time storage information.
             </p>
           </motion.div>
        </div>
      </div>
    </section>
  );
};

const OtherApps = () => {
  return (
    <section className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6 md:px-10 perspective-[1000px]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
          whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          whileHover={{ scale: 1.02, rotateX: 2, boxShadow: "0 0 80px rgba(217,70,239,0.2)" }}
          className="p-10 md:p-16 rounded-[3rem] border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-900/50 via-purple-900/30 to-[#050511]/80 flex flex-col md:flex-row items-center justify-between gap-10 shadow-[0_0_50px_rgba(217,70,239,0.15)] backdrop-blur-md"
        >
           <div className="max-w-2xl">
             <h2 className="text-fuchsia-400 font-bold text-sm uppercase tracking-widest mb-4">
                Other Published Applications
             </h2>
             <h3 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 drop-shadow-lg">Explore My Full Portfolio</h3>
             <p className="text-slate-300 text-base md:text-lg leading-relaxed">
               Alongside GalleryBox, I have published multiple other Android applications. Visit my Google Play developer profile to explore all my published, offline-first Android apps.
             </p>
           </div>
           <motion.a 
              whileHover={{ scale: 1.1, boxShadow: "0 0 30px rgba(6, 182, 212, 0.6)", y: -5 }}
              whileTap={{ scale: 0.95 }}
              href="https://play.google.com/store/apps/dev?id=4926136840256493221" 
              target="_blank" 
              rel="noreferrer"
              className="shrink-0 flex items-center gap-3 px-8 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-bold shadow-xl transition-all"
            >
             View all apps on Google Play <ExternalLink size={20}/>
           </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

const Footer = () => {
  return (
    <footer id="contact" className="relative pt-32 pb-10 px-6 md:px-10 overflow-hidden z-10">
      <div className="max-w-7xl mx-auto border-t border-white/10 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32">
          <div>
            <h2 className="text-5xl md:text-6xl font-display mb-8 font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 drop-shadow-sm">Let's build something <br/>exceptional.</h2>
            <motion.a 
              whileHover={{ x: 10, color: "#22d3ee" }}
              href="mailto:ishanmall789@gmail.com" 
              className="inline-flex items-center gap-4 text-2xl border-b border-cyan-500/50 pb-2 text-white transition-colors"
            >
              ishanmall789@gmail.com <ArrowUpRight size={24} className="text-cyan-400"/>
            </motion.a>
          </div>
          <div className="flex flex-col md:items-end justify-between">
            <div className="flex flex-wrap gap-6 mb-12 md:mb-0 md:justify-end">
              <motion.a whileHover={{ y: -5, color: "#fff", backgroundColor: "rgba(255,255,255,0.1)" }} href="https://github.com/ishanmall" target="_blank" rel="noreferrer" className="text-slate-400 transition-colors flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Code2 size={20}/> <span className="text-sm font-bold">GitHub</span>
              </motion.a>
              <motion.a whileHover={{ y: -5, color: "#fff", backgroundColor: "rgba(255,255,255,0.1)" }} href="https://www.linkedin.com/in/ishan-mall-4b20ab296/" target="_blank" rel="noreferrer" className="text-slate-400 transition-colors flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Briefcase size={20}/> <span className="text-sm font-bold">LinkedIn</span>
              </motion.a>
              <motion.a whileHover={{ y: -5, color: "#fff", backgroundColor: "rgba(255,255,255,0.1)" }} href="https://www.youtube.com/@ishanmall9527" target="_blank" rel="noreferrer" className="text-slate-400 transition-colors flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Tv size={20}/> <span className="text-sm font-bold">YouTube</span>
              </motion.a>
              <motion.a whileHover={{ y: -5, color: "#fff", backgroundColor: "rgba(255,255,255,0.1)" }} href="https://www.instagram.com/isha.ndisha/" target="_blank" rel="noreferrer" className="text-slate-400 transition-colors flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Camera size={20}/> <span className="text-sm font-bold">Instagram</span>
              </motion.a>
              <motion.a whileHover={{ y: -5, color: "#fff", boxShadow: "0 0 20px rgba(6,182,212,0.4)" }} href="https://play.google.com/store/apps/dev?id=4926136840256493221" target="_blank" rel="noreferrer" className="text-slate-400 transition-colors flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-2 rounded-full border border-cyan-500/30">
                <Play size={20} className="text-cyan-400"/> <span className="text-sm font-bold text-cyan-100">Play Store</span>
              </motion.a>
            </div>
            <p className="text-slate-500 text-sm text-right mt-8 md:mt-0 font-mono">
              &copy; {new Date().getFullYear()} — Gorakhpur, UP.
            </p>
          </div>
        </div>
        <h1 className="text-[14vw] leading-none font-display font-bold text-center tracking-tighter text-white/10 select-none pointer-events-none drop-shadow-2xl mix-blend-overlay">
          DEVELOPER
        </h1>
      </div>
    </footer>
  );
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      window.scrollTo(0, 0);
    }, 2500); 
  }, []);

  return (
    <ReactLenis root options={{ lerp: 0.05, smoothWheel: true }}>
      <AmbientBackground/>
      <CustomCursor/>
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div 
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[999] bg-[#050511] flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-display text-4xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-500 animate-pulse drop-shadow-[0_0_30px_rgba(217,70,239,0.5)]"
            >
              INITIALIZING...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="text-slate-200 min-h-screen selection:bg-fuchsia-500 selection:text-white">
        <Nav/>
        <Hero/>
        <About/>
        <ExperienceAndSkills/>
        <GalleryBoxCaseStudy/>
        <OtherApps/>
        <Footer/>
      </main>
    </ReactLenis>
  );
}