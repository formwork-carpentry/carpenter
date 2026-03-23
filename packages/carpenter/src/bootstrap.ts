import type { CarpenterConfig } from './types'
import { Application } from '@carpentry/formworks/foundation'

export async function bootstrap(config: CarpenterConfig) {
  return Application.create(config)
}
