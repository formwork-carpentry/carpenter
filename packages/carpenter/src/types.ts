export interface CarpenterConfig {
  appKey: string
  appEnv: 'local' | 'production' | 'testing'
  appDebug: boolean
  [key: string]: unknown
}
