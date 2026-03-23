/**
 * @carpentry/carpenter
 *
 * The Carpenter Framework — full-stack TypeScript framework for Bun and Node.js.
 * Re-exports everything from @carpentry/formworks plus framework-specific
 * bootstrapping, configuration, and application lifecycle management.
 */

// Re-export all formworks primitives so consumers only need one import
export * from '@carpentry/formworks'

// Framework-specific exports (carpenter-level concerns)
export { bootstrap } from './bootstrap'
export type { CarpenterConfig } from './types'
