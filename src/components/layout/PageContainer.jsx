import { motion } from 'framer-motion'
import { pageTransition } from '@/utils/animations'

/**
 * PageContainer - Wraps page content with smooth enter/exit animations
 * Use this to wrap the main content of each page
 */
export default function PageContainer({ children, className = '' }) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}
