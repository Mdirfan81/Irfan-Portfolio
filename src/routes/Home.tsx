import { Hero } from '@/sections/Hero'
import { About } from '@/sections/About'
import { Metrics } from '@/sections/Metrics'
import { Skills } from '@/sections/Skills'
import { Experience } from '@/sections/Experience'
import { Projects } from '@/sections/Projects'
import { Writing } from '@/sections/Writing'
import { Contact } from '@/sections/Contact'

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Metrics />
      <Skills />
      <Experience />
      <Projects />
      <Writing />
      <Contact />
    </>
  )
}
