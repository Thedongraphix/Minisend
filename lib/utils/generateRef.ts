// Utility to generate unique reference IDs for PayCrest

export function generateRef(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  
  return `PC_${timestamp}_${randomStr}`.toUpperCase()
}