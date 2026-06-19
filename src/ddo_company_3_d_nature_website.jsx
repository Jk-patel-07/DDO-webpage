import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Globe2, Zap, ShieldCheck, Code2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchTrigger } from "@/components/SearchTrigger";
import horseLogo from "@/assets/horse_logo.png";
import NatureBackground from "./components/NatureBackground";

export default function DDOCompanyWebsite() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const services = [
    {
      icon: <Code2 className="w-7 h-7" />,
      title: "Smart Web Development",
      text: "Modern websites, dashboards, and app interfaces with clean design and fast performance.",
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: "AI Powered Solutions",
      text: "AI search, automation, smart tools, and user-friendly digital features for businesses.",
    },
    {
      icon: <ShieldCheck className="w-7 h-7" />,
      title: "Secure Systems",
      text: "Safe login, protected data flow, and reliable project structure for real-world use.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020806] text-white">
      <NatureBackground />

      <header className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 gap-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 flex-shrink-0"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg backdrop-blur-md">
            <img src={horseLogo} alt="DDO Logo" className="h-6 w-6 object-contain invert" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide">DDO</h1>
            <p className="text-xs text-emerald-200/80">Nature Source Technology</p>
          </div>
        </motion.div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm text-white/75 md:flex">
          <a href="#about" className="transition hover:text-emerald-300">About</a>
          <a href="#services" className="transition hover:text-emerald-300">Services</a>
          <a href="/apps.html" className="transition hover:text-emerald-300">Our Apps</a>
          <a href="/CFM/company-login.html" className="transition hover:text-emerald-300">CFM</a>
          <a href="/DDO/ddo-one-form/" className="transition hover:text-emerald-300">DDO One</a>
          <a href="#contact" className="transition hover:text-emerald-300">Contact</a>
          <div className="ml-4 pl-4 border-l border-white/15">
            <SearchTrigger />
          </div>
        </nav>

        {/* Mobile/Tablet Search Widget */}
        <div className="flex md:hidden flex-1 justify-end max-w-[200px] sm:max-w-[280px]">
          <SearchTrigger />
        </div>
      </header>

      <main className="relative z-10">
        <section className="flex min-h-[82vh] items-center justify-center px-6 py-12 md:px-12">
          <div className="grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-100 backdrop-blur-md"
              >
                <Sparkles className="h-4 w-4" />
                Green ideas. Smart technology. Real solutions.
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.25 }}
                className="text-5xl font-black leading-tight md:text-7xl"
              >
                Building Future Tech With
                <span className="block bg-gradient-to-r from-emerald-300 via-lime-200 to-sky-300 bg-clip-text text-transparent">
                  Nature Energy
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="mt-6 max-w-xl text-lg leading-relaxed text-white/72"
              >
                DDO is a creative technology company focused on smart websites, AI tools, modern app designs, and secure digital systems inspired by the balance of nature.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.55 }}
                className="mt-8 flex flex-wrap gap-4"
              >
                <Button
                  className="rounded-2xl px-6 py-6 shadow-xl shadow-emerald-500/20"
                  onClick={() => window.location.href = "/DDO/ddo-one-form/"}
                >
                  Open DDO One <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl px-6 py-6"
                  onClick={() => window.location.href = "/CFM/company-login.html"}
                >
                  Open CFM
                </Button>
              </motion.div>
            </div>

            <div className="relative flex h-[460px] items-center justify-center [perspective:1200px]">
              <motion.div
                className="relative h-[330px] w-[330px] overflow-hidden rounded-[36px] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl md:h-[420px] md:w-[420px]"
                initial={{ rotateX: 20, rotateY: -20, scale: 0.8, opacity: 0 }}
                animate={{ rotateX: open ? 0 : 20, rotateY: open ? 0 : -20, scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-white/5 to-sky-400/20" />

                <motion.div
                  className="absolute left-0 top-0 flex h-full w-1/2 origin-left items-center justify-center border-r border-white/20 bg-gradient-to-br from-emerald-950 via-emerald-800 to-lime-700"
                  animate={{ rotateY: open ? -112 : 0 }}
                  transition={{ duration: 1.4, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <img src={horseLogo} alt="DDO Logo" className="h-16 w-16 object-contain invert opacity-90" />
                </motion.div>

                <motion.div
                  className="absolute right-0 top-0 flex h-full w-1/2 origin-right items-center justify-center border-l border-white/20 bg-gradient-to-bl from-sky-950 via-teal-800 to-emerald-700"
                  animate={{ rotateY: open ? 112 : 0 }}
                  transition={{ duration: 1.4, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Globe2 className="h-16 w-16 text-sky-200/90" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.7 }}
                  transition={{ delay: 1.25, duration: 0.8 }}
                  className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
                >
                  <motion.div
                    animate={{ y: [0, -12, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/20 shadow-2xl shadow-emerald-500/20"
                  >
                    <img src={horseLogo} alt="DDO Logo" className="h-14 w-14 object-contain invert" />
                  </motion.div>
                  <h3 className="text-5xl font-black tracking-widest">DDO</h3>
                  <p className="mt-3 text-emerald-100/85">Company Tech</p>
                  <p className="mt-5 max-w-xs text-sm text-white/65">
                    Open the window of innovation with clean, natural, and powerful digital experiences.
                  </p>
                </motion.div>
              </motion.div>

              <motion.div
                className="absolute bottom-8 h-14 w-72 rounded-full bg-black/40 blur-xl"
                animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.7, 0.45] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
          </div>
        </section>

        <section id="about" className="px-6 py-20 md:px-12">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {["Eco Inspired", "Modern UI", "Fast Build"].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12 }}
                className="rounded-[28px] border border-white/15 bg-white/10 p-7 shadow-xl backdrop-blur-xl"
              >
                <div className="text-4xl font-black text-emerald-300">0{index + 1}</div>
                <h3 className="mt-5 text-2xl font-bold">{item}</h3>
                <p className="mt-3 leading-relaxed text-white/65">
                  DDO creates digital products that feel simple, smooth, and natural for every user.
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="services" className="px-6 py-20 md:px-12">
          <div className="mx-auto max-w-6xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-black md:text-5xl"
            >
              What DDO Builds
            </motion.h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/65">
              From website design to AI-based tools, DDO helps turn ideas into useful digital products.
            </p>

            <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 35 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  whileHover={{ y: -10, rotateX: 4, rotateY: -4 }}
                >
                  <Card className="h-full overflow-hidden rounded-[30px] border-white/15 bg-white/10 text-white shadow-xl backdrop-blur-xl">
                    <CardContent className="p-8">
                      <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200/20 bg-emerald-300/15 text-emerald-200">
                        {service.icon}
                      </div>
                      <h3 className="text-2xl font-bold">{service.title}</h3>
                      <p className="mt-4 leading-relaxed text-white/65">{service.text}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="px-6 py-20 pb-28 md:px-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-5xl rounded-[36px] border border-white/15 bg-gradient-to-br from-emerald-300/20 to-sky-300/10 p-8 text-center shadow-2xl backdrop-blur-xl md:p-12"
          >
            <h2 className="text-4xl font-black md:text-5xl">Let's Grow Your Digital Idea</h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/70">
              Build your next website, app, or AI-powered system with DDO's clean and natural technology style.
            </p>
            <Button className="mt-8 rounded-2xl bg-white px-8 py-6 text-emerald-950 hover:bg-emerald-100">
              Contact DDO
            </Button>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
